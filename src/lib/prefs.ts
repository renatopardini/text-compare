export type Prefs = {
  theme: "system" | "light" | "dark";
  lang: "pt" | "en";
  view: "auto" | "split" | "unified";
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
};
export const PREFS_KEY = "text-compare:prefs";

export const defaultPrefs = (navigatorLang: string): Prefs => ({
  theme: "system",
  lang: navigatorLang.toLowerCase().startsWith("pt") ? "pt" : "en",
  view: "auto",
  ignoreWhitespace: false,
  ignoreCase: false,
});

const pick = <T,>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);

// Valores inválidos ou storage indisponível → padrão (campo a campo).
export function loadPrefs(): Prefs {
  const d = defaultPrefs((typeof navigator !== "undefined" && navigator.language) || "pt");
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
    if (!raw || typeof raw !== "object") return d;
    const p = raw as Record<string, unknown>;
    return {
      theme: pick(p.theme, ["system", "light", "dark"] as const, d.theme),
      lang: pick(p.lang, ["pt", "en"] as const, d.lang),
      view: pick(p.view, ["auto", "split", "unified"] as const, d.view),
      ignoreWhitespace: pick(p.ignoreWhitespace, [true, false], d.ignoreWhitespace),
      ignoreCase: pick(p.ignoreCase, [true, false], d.ignoreCase),
    };
  } catch {
    return d;
  }
}

// Store mínimo para useSyncExternalStore: o snapshot só muda de identidade em savePrefs.
let current: Prefs | undefined;
const listeners = new Set<() => void>();
export const getPrefs = (): Prefs => (current ??= loadPrefs());
export const subscribePrefs = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
export function savePrefs(p: Prefs): void {
  current = p;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // storage indisponível (modo privado, bloqueado): vale só para esta sessão
  }
  listeners.forEach((l) => l());
}
