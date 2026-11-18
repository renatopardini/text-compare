import { test } from "node:test";
import assert from "node:assert/strict";
import { diffRows } from "./diffRows.ts";

const text = (side) => side && side.parts.map((p) => p.value).join("");

test("textos iguais (mesmo com CRLF e sem \\n final) não geram alteração", () => {
  const rows = diffRows("a\r\nb", "a\nb\n");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.type === "same"));
});

test("linha alterada é pareada e destaca só a palavra trocada", () => {
  const [row] = diffRows("ola mundo", "ola gente");
  assert.equal(row.type, "changed");
  assert.deepEqual(row.left.parts.filter((p) => p.changed).map((p) => p.value), ["mundo"]);
  assert.deepEqual(row.right.parts.filter((p) => p.changed).map((p) => p.value), ["gente"]);
});

test("linhas extras ficam só de um lado e a numeração segue correta", () => {
  const rows = diffRows("a\nb\nc", "a\nx\ny\nz\nc");
  assert.deepEqual(rows.map((r) => [r.left?.num ?? null, text(r.left), r.right?.num ?? null, text(r.right)]), [
    [1, "a", 1, "a"],
    [2, "b", 2, "x"],
    [null, null, 3, "y"],
    [null, null, 4, "z"],
    [3, "c", 5, "c"],
  ]);
});
