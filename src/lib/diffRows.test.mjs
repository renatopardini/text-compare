import { test } from "node:test";
import assert from "node:assert/strict";
import { diffRows, computeDiff, toLines } from "./diffRows.ts";
import { findAnchors } from "./anchors.ts";

const text = (side) => side && side.parts.map((p) => p.value).join("");
const changedWords = (side) => side.parts.filter((p) => p.changed).map((p) => p.value);

// Gerador determinístico (LCG) para testes reproduzíveis.
const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);

test("textos iguais (mesmo com CRLF e sem \\n final) não geram alteração", () => {
  const rows = diffRows("a\r\nb", "a\nb\n");
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.type === "same"));
});

test("linha alterada é pareada e destaca só a palavra trocada", () => {
  const [row] = diffRows("ola mundo", "ola gente");
  assert.equal(row.type, "changed");
  assert.deepEqual(changedWords(row.left), ["mundo"]);
  assert.deepEqual(changedWords(row.right), ["gente"]);
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

test("findAnchors: só linhas únicas, em ordem crescente, respeitando o intervalo", () => {
  const a = ["x", "a", "b", "x", "c", "d"];
  const b = ["c", "a", "x", "b", "d", "x"];
  // a, b e d estão em ordem nos dois lados; c está fora de ordem; x é duplicado
  assert.deepEqual(findAnchors(a, 0, a.length, b, 0, b.length), [[1, 1], [2, 3], [5, 4]]);
  // Em a[3..6) = x,c,d e b[2..6) = x,b,d,x: x se repete em b, c não existe em b; só d é âncora
  assert.deepEqual(findAnchors(a, 3, 6, b, 2, 6), [[5, 4]]);
  // Em a[0..3) = x,a,b e b[1..4) = a,x,b: x passa a ser único, mas a LIS fica com 2 dos 3
  assert.equal(findAnchors(a, 0, 3, b, 1, 4).length, 2);
});

test("tipos de linha separados e estatísticas", () => {
  const r = computeDiff("a\nb", "a\nx\ny");
  assert.deepEqual(r.rows.map((x) => x.type), ["same", "changed", "added"]);
  assert.deepEqual(r.stats, { changed: 1, removed: 0, added: 1 });
  assert.equal(computeDiff("a\nb\nc", "a").stats.removed, 2);
});

test("texto vazio contra texto com conteúdo: tudo adicionado", () => {
  const r = computeDiff("", "a\nb");
  assert.deepEqual(r.rows.map((x) => x.type), ["added", "added"]);
  assert.deepEqual(computeDiff("", "").rows, []);
});

test("ignoreWhitespace", () => {
  assert.ok(computeDiff("  a  b", "a b", { ignoreWhitespace: true }).rows.every((r) => r.type === "same"));
  assert.equal(computeDiff("  a  b", "a b").rows[0].type, "changed");
  // Linha igual só pela chave mostra o texto original de cada lado
  const [row] = computeDiff("  a  b", "a b", { ignoreWhitespace: true }).rows;
  assert.equal(text(row.left), "  a  b");
  assert.equal(text(row.right), "a b");
});

test("ignoreCase", () => {
  assert.ok(computeDiff("Olá Mundo", "olá mundo", { ignoreCase: true }).rows.every((r) => r.type === "same"));
  const [row] = computeDiff("Olá Mundo", "olá gente", { ignoreCase: true }).rows;
  assert.equal(row.type, "changed");
  assert.deepEqual(changedWords(row.left), ["Mundo"]);
  assert.deepEqual(changedWords(row.right), ["gente"]);
  // Cada lado mostra o próprio texto, não o do outro
  assert.equal(text(row.left), "Olá Mundo");
  assert.equal(text(row.right), "olá gente");
});

test("hunks: dois blocos separados por linhas iguais", () => {
  const r = computeDiff("a\nb\nc\nd\ne", "a\nB\nc\nd\nE");
  assert.deepEqual(r.hunks, [1, 4]);
  assert.deepEqual(computeDiff("x\ny", "z\ny").hunks, [0]);
});

test("desempenho: 100 mil linhas, uma em cada duas alteradas", () => {
  const a = [], b = [];
  for (let i = 0; i < 100_000; i++) {
    a.push(`linha ${i} conteúdo original`);
    b.push(i % 2 ? `linha ${i} conteúdo alterado` : `linha ${i} conteúdo original`);
  }
  const t = performance.now();
  const r = computeDiff(a.join("\n"), b.join("\n"));
  const ms = performance.now() - t;
  assert.equal(r.approximate, false);
  assert.equal(r.stats.changed, 50_000);
  assert.ok(ms < 1500, `levou ${ms.toFixed(0)} ms`);
});

test("patológico sem âncoras termina e é coerente", () => {
  const t = performance.now();
  const r = computeDiff(Array(5000).fill("x").join("\n"), Array(5000).fill("y").join("\n"));
  const ms = performance.now() - t;
  assert.ok(ms < 3000, `levou ${ms.toFixed(0)} ms`);
  assert.equal(r.stats.changed, 5000);
  assert.equal(r.rows.length, 5000);
});

test("equivalência: as rows reconstroem exatamente os dois textos", () => {
  const rand = rng(42);
  const words = ["a", "b", "c", "}", "", "  x", "Foo bar", "foo  bar"];
  const gen = () => Array.from({ length: Math.floor(rand() * 30) }, () => words[Math.floor(rand() * words.length)]).join("\n");
  const join = (lines) => lines.join("\n");
  for (let n = 0; n < 200; n++) {
    const a = gen();
    const b = rand() < 0.5 ? gen() : a.split("\n").map((l) => (rand() < 0.3 ? words[Math.floor(rand() * words.length)] : l)).join("\n");
    for (const options of [{}, { ignoreWhitespace: true }, { ignoreCase: true }, { ignoreWhitespace: true, ignoreCase: true }]) {
      const { rows } = computeDiff(a, b, options);
      assert.equal(join(rows.filter((r) => r.left).map((r) => text(r.left))), join(toLines(a)), `esquerda ${n} ${JSON.stringify(options)}`);
      assert.equal(join(rows.filter((r) => r.right).map((r) => text(r.right))), join(toLines(b)), `direita ${n} ${JSON.stringify(options)}`);
      // numeração contínua
      rows.filter((r) => r.left).forEach((r, k) => assert.equal(r.left.num, k + 1));
      rows.filter((r) => r.right).forEach((r, k) => assert.equal(r.right.num, k + 1));
    }
  }
});
