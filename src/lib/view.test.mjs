import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDiff } from "./diffRows.ts";
import { buildView, toUnified, hunkPositions } from "./view.ts";

const lines = (n, p = "s") => Array.from({ length: n }, (_, i) => `${p}${i}`);
// x + 20 iguais + y, alterando x e y
const { rows, hunks } = computeDiff(["x", ...lines(20), "y"].join("\n"), ["X", ...lines(20), "Y"].join("\n"));
const shape = (items) => items.map((it) => (it.kind === "gap" ? `gap${it.to - it.from}` : "r"));

test("buildView: 20 iguais entre duas diferenças → 3 + gap(14) + 3", () => {
  assert.deepEqual(shape(buildView(rows, new Set(), false)), ["r", "r", "r", "r", "gap14", "r", "r", "r", "r"]);
});

test("buildView: gap expandido e showAll não recolhem", () => {
  const gap = buildView(rows, new Set(), false).find((it) => it.kind === "gap");
  assert.equal(buildView(rows, new Set([gap.from]), false).length, 22);
  assert.equal(buildView(rows, new Set(), true).length, 22);
});

test("buildView: no início/fim só mantém o contexto do lado da diferença; sem diferenças, nada", () => {
  const r = computeDiff([...lines(10), "x"].join("\n"), [...lines(10), "X"].join("\n")).rows;
  assert.deepEqual(shape(buildView(r, new Set(), false)), ["gap7", "r", "r", "r", "r"]);
  assert.deepEqual(buildView(computeDiff("a\nb", "a\nb").rows, new Set(), false), []);
});

test("toUnified: changed vira duas linhas, left antes de right", () => {
  const r = computeDiff("a\nb\nc", "a\nB\nd\ne").rows;
  const u = toUnified(buildView(r, new Set(), false), r);
  assert.deepEqual(u.map((it) => it.side), ["both", "left", "right", "left", "right", "right"]);
});

test("hunkPositions aponta o início de cada bloco", () => {
  const view = buildView(rows, new Set(), false);
  assert.deepEqual(hunkPositions(view, hunks), [0, 8]);
  assert.deepEqual(hunkPositions(toUnified(view, rows), hunks), [0, 9]);
});
