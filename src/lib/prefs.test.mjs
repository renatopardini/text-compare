import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPrefs, defaultPrefs, PREFS_KEY } from "./prefs.ts";
import { messages } from "./i18n.ts";

const setStorage = (value) => Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true });
const fakeStorage = (data) => ({ getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } });
const lang = defaultPrefs(navigator.language).lang;

test("idioma padrão pelo navegador", () => {
  assert.equal(defaultPrefs("pt-BR").lang, "pt");
  assert.equal(defaultPrefs("en-US").lang, "en");
  assert.equal(defaultPrefs("es").lang, "en");
});

test("JSON inválido ou valores desconhecidos → padrão", () => {
  setStorage(fakeStorage({ [PREFS_KEY]: "{oops" }));
  assert.deepEqual(loadPrefs(), defaultPrefs(navigator.language));
  setStorage(fakeStorage({ [PREFS_KEY]: JSON.stringify({ theme: "roxo", lang: "en", ignoreCase: "sim", extra: 1 }) }));
  assert.deepEqual(loadPrefs(), { ...defaultPrefs(navigator.language), lang: "en" });
});

test("preferências válidas são lidas", () => {
  const p = { theme: "dark", lang: "pt", view: "unified", ignoreWhitespace: true, ignoreCase: false };
  setStorage(fakeStorage({ [PREFS_KEY]: JSON.stringify(p) }));
  assert.deepEqual(loadPrefs(), p);
});

test("localStorage que lança erro não quebra", () => {
  setStorage({ getItem() { throw new Error("SecurityError"); } });
  assert.equal(loadPrefs().lang, lang);
});

test("pt e en têm as mesmas chaves", () => {
  const keys = (o) => Object.keys(o).sort();
  assert.deepEqual(keys(messages.en), keys(messages.pt));
  for (const k of keys(messages.pt)) assert.equal(typeof messages.en[k], typeof messages.pt[k], k);
});
