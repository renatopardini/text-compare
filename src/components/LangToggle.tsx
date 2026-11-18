"use client";

import type { Messages } from "@/lib/i18n";
import type { Prefs } from "@/lib/prefs";

export function LangToggle({ lang, t, onChange }: { lang: Prefs["lang"]; t: Messages; onChange: (lang: Prefs["lang"]) => void }) {
  return (
    <div role="group" aria-label={t.language} className="flex rounded border border-zinc-300 text-xs font-medium dark:border-zinc-700">
      {(["pt", "en"] as const).map((v) => (
        <button
          key={v}
          lang={v === "pt" ? "pt-BR" : "en"}
          aria-pressed={lang === v}
          onClick={() => onChange(v)}
          className={`px-2 py-1 ${lang === v ? "bg-zinc-200 dark:bg-zinc-700" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
