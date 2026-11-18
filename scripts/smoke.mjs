// Teste de fumaça no app desktop real: comparação automática, desempenho com 100 mil linhas,
// virtualização, tema e idioma. Uso: npm run build:static && npm run smoke
import { launch } from "./cdp.mjs";

const app = await launch();
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` (${detail})` : ""}`);
};
const rowCount = `document.querySelectorAll("[role=row]").length`;

try {
  // Começa das preferências padrão, guardando as do usuário para restaurar no fim.
  const saved = await app.evaluate(`localStorage.getItem("text-compare:prefs")`);
  await app.evaluate(`localStorage.setItem("text-compare:prefs", JSON.stringify({ lang: "pt", theme: "light" }))`);
  await app.reload();

  // 1. Comparação automática, sem clique; 50 linhas ficam todas no DOM.
  const lines = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("\n");
  await app.fill(0, lines(50, (i) => `a ${i}`));
  await app.fill(1, lines(50, (i) => `b ${i}`));
  await app.waitFor(`${rowCount} === 50`, 3000).then(
    () => check("comparação automática; 50 linhas todas no DOM", true),
    () => check("comparação automática; 50 linhas todas no DOM", false),
  );

  // 2. 100 mil linhas, metade alterada.
  const big = 100_000;
  await app.evaluate(`window.__lt = []; new PerformanceObserver((l) => window.__lt.push(...l.getEntries().map((e) => e.duration))).observe({ type: "longtask" })`);
  const t0 = await app.evaluate("performance.now()");
  await app.fill(0, lines(big, (i) => `linha ${i} conteúdo original`));
  await app.fill(1, lines(big, (i) => (i % 2 ? `linha ${i} conteúdo alterado` : `linha ${i} conteúdo original`)));
  const t1 = await app.evaluate("performance.now()");
  await app.evaluate(`window.__lt = []`); // tarefas longas do próprio textarea ao receber o texto não contam
  await app.waitFor(`[...document.querySelectorAll("p")].some((p) => p.textContent.startsWith("50000 alterada"))`, 10_000);
  const t2 = await app.evaluate("performance.now()");
  // Espera a pintura e o resultado assentarem.
  await app.evaluate(`new Promise((r) => requestAnimationFrame(() => setTimeout(r, 200)))`);
  const longest = Math.max(0, ...(await app.evaluate("window.__lt")));
  check("resultado de 100 mil linhas em < 2 s", t2 - t1 < 2000, `${Math.round(t2 - t1)} ms após preencher; preencher levou ${Math.round(t1 - t0)} ms`);
  check("nenhuma long task > 200 ms", longest <= 200, `maior: ${Math.round(longest)} ms`);
  const domRows = await app.evaluate(rowCount);
  check("virtualização ativa (< 300 linhas no DOM)", domRows < 300, `${domRows} linhas`);

  // 3. Tema e idioma.
  await app.click(`[aria-label="Escuro"]`);
  check("tema escuro aplica data-theme", (await app.evaluate("document.documentElement.dataset.theme")) === "dark");
  await app.click(`button[lang="en"]`);
  await app.waitFor(`document.title === "Compare texts"`, 2000).then(
    () => check("idioma EN muda o título", true),
    () => check("idioma EN muda o título", false),
  );

  await app.evaluate(saved === null ? `localStorage.removeItem("text-compare:prefs")` : `localStorage.setItem("text-compare:prefs", ${JSON.stringify(saved)})`);
} catch (e) {
  check(String(e.message ?? e), false);
} finally {
  app.quit();
}

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} verificação(ões) falharam.` : "\nTudo certo.");
process.exit(failed ? 1 : 0);
