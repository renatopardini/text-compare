import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFile } from "./decodeFile.ts";

const file = (bytes) => new File([new Uint8Array(bytes)], "x.txt");

test("UTF-8 com acentos", async () => {
  const r = await decodeFile(new File(["ação é"], "x.txt"));
  assert.deepEqual(r, { text: "ação é", encoding: "utf-8" });
});

test("BOM UTF-8 é removido", async () => {
  const r = await decodeFile(file([0xef, 0xbb, 0xbf, 0x61]));
  assert.deepEqual(r, { text: "a", encoding: "utf-8" });
});

test("Windows-1252: 'ação' salvo como ANSI", async () => {
  const r = await decodeFile(file([0x61, 0xe7, 0xe3, 0x6f]));
  assert.deepEqual(r, { text: "ação", encoding: "windows-1252" });
});

test("UTF-16 LE com BOM (Bloco de Notas 'Unicode')", async () => {
  const r = await decodeFile(file([0xff, 0xfe, 0x61, 0x00, 0xe7, 0x00]));
  assert.deepEqual(r, { text: "aç", encoding: "utf-16" });
});

test("arquivo binário é rejeitado", async () => {
  await assert.rejects(decodeFile(file([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01])), { message: "binary" });
});
