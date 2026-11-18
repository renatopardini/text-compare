"use client";

import type { DiffStats } from "@/lib/diffRows";
import type { Messages } from "@/lib/i18n";

type Props = {
  stats: DiffStats;
  approximate: boolean;
  t: Messages;
  current: number; // -1 = nenhum bloco selecionado
  total: number;
  onPrev: () => void;
  onNext: () => void;
  showAll: boolean;
  onShowAll: (v: boolean) => void;
};

export function DiffSummary({ stats, approximate, t, current, total, onPrev, onNext, showAll, onShowAll }: Props) {
  const nav = "rounded border border-zinc-300 px-2 py-0.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
      <p>{t.stats(stats)}</p>
      <div className="flex items-center gap-1">
        <button className={nav} onClick={onPrev} title={t.prevDiff} aria-label={t.prevDiff}>↑</button>
        <button className={nav} onClick={onNext} title={t.nextDiff} aria-label={t.nextDiff}>↓</button>
        <span className="ml-1 tabular-nums" aria-live="polite">{t.position(current + 1, total)}</span>
      </div>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={showAll} onChange={(e) => onShowAll(e.target.checked)} />
        {t.showAll}
      </label>
      {approximate && <p role="note" className="w-full rounded bg-amber-100 px-2 py-1 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">{t.approximate}</p>}
    </div>
  );
}
