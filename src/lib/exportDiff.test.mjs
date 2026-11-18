import { test } from "node:test";
import assert from "node:assert/strict";
import { applyPatch } from "diff";
import { computeDiff, toLines } from "./diffRows.ts";
import { buildView } from "./view.ts";
import { toUnifiedPatch, toHtml } from "./exportDiff.ts";
import { messages } from "./i18n.ts";

const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const norm = (s) => toLines(s).map((l) => l + "\n").join("");
const roundTrip = (a, b) => {
  const patch = toUnifiedPatch(computeDiff(a, b).rows, "a.txt");
  return patch === "" ? norm(a) : applyPatch(norm(a), patch);
};

test("ida e volta: applyPatch(original, patch) === alterado", () => {
  const rand = rng(7);
  const words = ["a", "b", "c", "d", "", "}"];
  const gen = (n) => Array.from({ length: n }, () => words[Math.floor(rand() * words.length)]).join("\n");
  for (let n = 0; n < 200; n++) {
    const a = gen(Math.floor(rand() * 40));
    const b = rand() < 0.3 ? gen(Math.floor(rand() * 40)) : a.split("\n").map((l) => (rand() < 0.15 ? gen(Math.floor(rand() * 3)) : l)).join("\n");
    assert.equal(roundTrip(a, b), norm(b), `caso ${n}\n--- a\n${a}\n--- b\n${b}`);
  }
});

test("texto vazio contra texto com conteúdo, e o inverso", () => {
  assert.equal(roundTrip("", "x\ny"), "x\ny\n");
  assert.equal(roundTrip("x\ny", ""), "");
  assert.match(toUnifiedPatch(computeDiff("", "x").rows, "a"), /^@@ -0,0 \+1,1 @@$/m);
});

test("cabeçalhos de bloco no formato unificado", () => {
  const a = Array.from({ length: 20 }, (_, i) => `l${i}`);
  const b = [...a];
  b[2] = "X";
  b[15] = "Y";
  const patch = toUnifiedPatch(computeDiff(a.join("\n"), b.join("\n")).rows, "a");
  assert.deepEqual(patch.match(/^@@.*@@$/gm), ["@@ -1,6 +1,6 @@", "@@ -13,7 +13,7 @@"]);
});

test("HTML não tem scripts e escapa o texto", () => {
  const { rows, stats } = computeDiff("<b>oi</b>", "<script>alert(1)</script>");
  const html = toHtml(rows, buildView(rows, new Set(), false), stats, messages.pt, "dark");
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("<b>"));
  assert.ok(html.includes("&#60;") && html.includes("&#62;"));
});
