"use client";

import { useEffect, type ReactNode } from "react";
import type { Messages } from "@/lib/i18n";
import { getPrefs, type Prefs } from "@/lib/prefs";

const icon = (d: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const icons = {
  system: icon(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>),
  light: icon(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  dark: icon(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
};

type Theme = Prefs["theme"];

export function ThemeToggle({ theme, t, onChange }: { theme: Theme; t: Messages; onChange: (theme: Theme) => void }) {
  // Só mexe no DOM. Lê getPrefs() em vez de `theme` porque, no passe de hidratação, `theme` ainda é o valor do servidor.
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const p = getPrefs().theme;
      document.documentElement.dataset.theme = p === "system" ? (mq.matches ? "dark" : "light") : p;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const titles: Record<Theme, string> = { system: t.themeSystem, light: t.themeLight, dark: t.themeDark };
  return (
    <div role="group" aria-label={t.theme} className="flex rounded border border-zinc-300 dark:border-zinc-700">
      {(["system", "light", "dark"] as const).map((v) => (
        <button
          key={v}
          aria-pressed={theme === v}
          title={titles[v]}
          aria-label={titles[v]}
          onClick={() => onChange(v)}
          className={`p-1.5 ${theme === v ? "bg-zinc-200 dark:bg-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          {icons[v]}
        </button>
      ))}
    </div>
  );
}
