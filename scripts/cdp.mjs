// Abre o app desktop (Electron) com a porta de depuração ligada e conversa com a página pelo CDP
// (Chrome DevTools Protocol). Usado por smoke.mjs e screenshots.mjs. Requer `npm run build:static` antes.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const electron = createRequire(import.meta.url)("electron"); // caminho do executável
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Exemplo usado nos prints do README.
export const contract = [
  "Contrato de Prestação de Serviços\n\n1. O prazo de entrega é de 30 dias corridos.\n2. O pagamento será feito em 3 parcelas mensais.\n3. Multa por atraso: 2% ao mês.\n4. O suporte técnico está incluso por 6 meses.\n5. Foro da comarca de São Paulo.",
  "Contrato de Prestação de Serviços\n\n1. O prazo de entrega é de 45 dias úteis.\n2. O pagamento será feito em 3 parcelas mensais.\n3. Multa por atraso: 1% ao mês, limitada a 10%.\n4. O suporte técnico está incluso por 12 meses.\n5. Foro da comarca de São Paulo.\n6. Este contrato pode ser renovado por igual período.",
];

export async function launch(port = 9333) {
  if (!existsSync(path.join(root, "out", "index.html"))) throw new Error("out/ não existe: rode `npm run build:static` antes.");
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE; // definida pelo terminal do VS Code; faria o Electron rodar como Node
  const proc = spawn(electron, [".", `--remote-debugging-port=${port}`], { cwd: root, env, stdio: "ignore" });
  try {
    for (let i = 0; i < 150; i++) {
      await sleep(200);
      const list = await fetch(`http://127.0.0.1:${port}/json`).then((r) => r.json()).catch(() => []);
      const page = list.find((p) => p.type === "page" && p.url.startsWith("app://local/"));
      if (!page) continue;
      const cdp = await connect(page.webSocketDebuggerUrl);
      await cdp.waitFor(`document.readyState === "complete" && !!document.querySelector("textarea")`);
      return { ...cdp, quit: () => { cdp.close(); proc.kill(); } };
    }
    throw new Error("O app não abriu em 30 s.");
  } catch (e) {
    proc.kill();
    throw e;
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("falha ao conectar no CDP")); });
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.rej(new Error(m.error.message));
    else p.res(m.result);
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const waitFor = async (expression, timeout = 10_000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await evaluate(`(() => { try { return !!(${expression}); } catch { return false; } })()`).catch(() => false)) return;
      await sleep(30);
    }
    throw new Error(`Tempo esgotado esperando: ${expression}`);
  };
  // Preenche um textarea do jeito que o React percebe (setter nativo + evento input).
  const fill = (index, value) =>
    evaluate(`(() => {
      const ta = document.querySelectorAll("textarea")[${index}];
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(ta, ${JSON.stringify(value)});
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const reload = async () => {
    await evaluate("location.reload()");
    await sleep(300);
    await waitFor(`document.readyState === "complete" && !!document.querySelector("textarea")`);
  };
  return { send, evaluate, waitFor, fill, click, reload, close: () => ws.close() };
}
