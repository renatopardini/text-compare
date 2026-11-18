import type { DiffStats, Row, Side } from "./diffRows";
import type { Messages } from "./i18n";
import type { ViewItem } from "./view";

const lineText = (s: Side) => (s ? s.parts.map((p) => p.value).join("") : "");

// Patch unificado (formato do `git diff`/`patch`) montado a partir das rows já calculadas,
// evitando o createTwoFilesPatch, que usa Myers e trava em textos grandes.
// Deve receber rows calculadas SEM as opções de ignorar, para que o patch aplique exatamente.
// O nome do original vai nos dois cabeçalhos (como no `git diff`); nomes diferentes fariam o `git apply` procurar o arquivo novo.
// shortcut: assume "\n" no fim dos dois textos (sem "\ No newline at end of file"); tratar se aparecerem patches rejeitados por isso.
export function toUnifiedPatch(rows: Row[], name: string, context = 3): string {
  // aBefore[i]/bBefore[i] = linhas de cada lado antes de rows[i]
  const aBefore = new Int32Array(rows.length + 1);
  const bBefore = new Int32Array(rows.length + 1);
  rows.forEach((r, i) => { aBefore[i + 1] = aBefore[i] + (r.left ? 1 : 0); bBefore[i + 1] = bBefore[i] + (r.right ? 1 : 0); });

  const out = [`--- a/${name}`, `+++ b/${name}`];
  const isSame = (i: number) => rows[i].type === "same";
  let i = 0;
  while (i < rows.length) {
    if (isSame(i)) { i++; continue; }
    // Estende o bloco enquanto a próxima diferença estiver a até 2×context linhas iguais.
    let end = i;
    for (;;) {
      while (end < rows.length && !isSame(end)) end++;
      let k = end;
      while (k < rows.length && isSame(k) && k - end < 2 * context) k++;
      if (k < rows.length && !isSame(k)) end = k;
      else break;
    }
    const start = Math.max(0, i - context);
    const stop = Math.min(rows.length, end + context);
    const oldLines = aBefore[stop] - aBefore[start];
    const newLines = bBefore[stop] - bBefore[start];
    out.push(`@@ -${aBefore[start] + (oldLines ? 1 : 0)},${oldLines} +${bBefore[start] + (newLines ? 1 : 0)},${newLines} @@`);
    for (let j = start; j < stop; ) {
      if (isSame(j)) { out.push(" " + lineText(rows[j++].left)); continue; }
      const runStart = j;
      while (j < stop && !isSame(j)) j++;
      for (let k = runStart; k < j; k++) if (rows[k].left) out.push("-" + lineText(rows[k].left));
      for (let k = runStart; k < j; k++) if (rows[k].right) out.push("+" + lineText(rows[k].right));
    }
    i = stop;
  }
  return out.length > 2 ? out.join("\n") + "\n" : "";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const palettes = {
  light: { bg: "#fff", fg: "#171717", muted: "#a1a1aa", border: "#d4d4d8", empty: "#f4f4f5", del: "#fef2f2", add: "#f0fdf4", delWord: "#fca5a5", addWord: "#86efac" },
  dark: { bg: "#0a0a0a", fg: "#ededed", muted: "#71717a", border: "#3f3f46", empty: "#27272a80", del: "#450a0a66", add: "#052e1666", delWord: "#991b1b", addWord: "#166534" },
};

// HTML autocontido (CSS inline, sem scripts), lado a lado, com o mesmo recolhimento da tela e o tema/idioma atuais.
export function toHtml(rows: Row[], view: ViewItem[], stats: DiffStats, t: Messages, theme: "light" | "dark"): string {
  const c = palettes[theme];
  const cells = (s: Side, kind: "d" | "a", same: boolean) => {
    if (!s) return `<td class="e" colspan="2"></td>`;
    const cls = same ? "" : ` class="${kind}"`;
    const tag = kind === "d" ? "del" : "ins";
    const sign = same ? "" : `<span aria-hidden="true">${kind === "d" ? "−" : "+"}</span>`;
    const text = s.parts.map((p) => (p.changed ? `<${tag}>${esc(p.value)}</${tag}>` : esc(p.value))).join("");
    return `<td${cls}><span class="n">${sign}${s.num}</span></td><td${cls}>${text}</td>`;
  };
  const body = view
    .map((it) => {
      if (it.kind === "gap") return `<tr><td class="g" colspan="4">${esc(t.gapStatic(it.to - it.from))}</td></tr>`;
      const r = rows[it.index];
      return `<tr>${cells(r.left, "d", r.type === "same")}${cells(r.right, "a", r.type === "same")}</tr>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)}</title>
<style>
body{margin:0;padding:16px;background:${c.bg};color:${c.fg};font-family:system-ui,sans-serif;color-scheme:${theme}}
p{color:${c.muted};font-size:14px}
table{width:100%;table-layout:fixed;border-collapse:collapse;font:13px/1.5 ui-monospace,Consolas,monospace;border:1px solid ${c.border}}
col.num{width:4em}td{vertical-align:top;padding:0 8px;white-space:pre-wrap;overflow-wrap:anywhere}
td:nth-child(3){border-left:1px solid ${c.border}}.n{display:block;text-align:right;color:${c.muted}}
.d{background:${c.del}}.a{background:${c.add}}.e{background:${c.empty}}
del{background:${c.delWord};color:inherit}ins{background:${c.addWord};color:inherit}
.g{text-align:center;color:${c.muted};padding:4px}
</style></head>
<body>
<h1>${esc(t.title)}</h1>
<p>${esc(t.stats(stats))}</p>
<table><colgroup><col class="num"><col><col class="num"><col></colgroup>
${body}
</table>
</body>
</html>
`;
}

export function downloadFile(name: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
