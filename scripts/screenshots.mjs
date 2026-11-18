// Gera os prints do README em docs/screenshots/. Uso: npm run build:static && npm run screenshots
import { writeFileSync } from "node:fs";
import path from "node:path";
import { contract, launch, root } from "./cdp.mjs";

const shots = [
  { file: "comparacao-claro.png", prefs: { theme: "light", lang: "pt" } },
  { file: "comparacao-escuro.png", prefs: { theme: "dark", lang: "pt" } },
  { file: "comparacao-en.png", prefs: { theme: "light", lang: "en" } },
  { file: "unificado-estreito.png", prefs: { theme: "light", lang: "pt", view: "auto" }, width: 420 },
  { file: "textos-identicos.png", prefs: { theme: "light", lang: "pt" }, texts: [contract[0], contract[0]] },
];

const app = await launch();
try {
  const saved = await app.evaluate(`localStorage.getItem("text-compare:prefs")`);
  for (const s of shots) {
    const width = s.width ?? 1280;
    await app.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 2, mobile: false });
    await app.evaluate(`localStorage.setItem("text-compare:prefs", ${JSON.stringify(JSON.stringify(s.prefs))})`);
    await app.reload();
    const [a, b] = s.texts ?? contract;
    await app.fill(0, a);
    await app.fill(1, b);
    await app.waitFor(`document.querySelector("[role=table], .bg-green-100")`, 5000);
    await app.evaluate(`document.activeElement?.blur(); new Promise((r) => setTimeout(r, 300))`);
    const height = await app.evaluate(`Math.ceil(document.querySelector("main").lastElementChild.getBoundingClientRect().bottom + scrollY + 24)`);
    await app.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: false });
    await app.evaluate(`new Promise((r) => setTimeout(r, 200))`);
    const { data } = await app.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path.join(root, "docs", "screenshots", s.file), Buffer.from(data, "base64"));
    console.log(`✔ ${s.file}`);
  }
  await app.evaluate(saved === null ? `localStorage.removeItem("text-compare:prefs")` : `localStorage.setItem("text-compare:prefs", ${JSON.stringify(saved)})`);
} finally {
  app.quit();
}
