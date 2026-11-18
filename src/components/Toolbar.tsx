"use client";

import type { Messages } from "@/lib/i18n";
import type { Prefs } from "@/lib/prefs";

export const buttonClass = "rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800";

type Props = {
  t: Messages;
  prefs: Prefs;
  onCompare: () => void;
  onSwap: () => void;
  onClear: () => void;
  onPrefs: (patch: Partial<Prefs>) => void;
};

export function Toolbar({ t, prefs, onCompare, onSwap, onClear, onPrefs }: Props) {
  return (
    <div className="my-4 flex flex-wrap items-center gap-2">
      <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={onCompare} title={t.compareHint}>
        {t.compare}
      </button>
      <button className={buttonClass} onClick={onSwap}>{t.swap}</button>
      <button className={buttonClass} onClick={onClear}>{t.clear}</button>
      <label className="ml-2 flex items-center gap-1 text-sm">
        <input type="checkbox" checked={prefs.ignoreWhitespace} onChange={(e) => onPrefs({ ignoreWhitespace: e.target.checked })} />
        {t.ignoreWhitespace}
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={prefs.ignoreCase} onChange={(e) => onPrefs({ ignoreCase: e.target.checked })} />
        {t.ignoreCase}
      </label>
      <label className="flex items-center gap-1 text-sm sm:ml-auto">
        {t.viewMode}
        <select
          className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          value={prefs.view}
          onChange={(e) => onPrefs({ view: e.target.value as Prefs["view"] })}
        >
          <option value="auto">{t.viewAuto}</option>
          <option value="split">{t.viewSplit}</option>
          <option value="unified">{t.viewUnified}</option>
        </select>
      </label>
    </div>
  );
}
