"use client";

import type { UnifiedItem } from "@/lib/view";
import { activeRow, GapRow, isActive, lineBg, Parts, Sign, type ResultProps } from "./DiffTable";
import { VirtualRows } from "./VirtualRows";

const GRID = "grid grid-cols-[3rem_3rem_1.5rem_minmax(0,1fr)]";
const num = "select-none px-1 text-right text-zinc-400";

// Uma coluna: número antigo, número novo, sinal e texto.
export function UnifiedView({ rows, items, t, active, onExpand, listRef }: ResultProps & { items: UnifiedItem[] }) {
  return (
    <div role="table" aria-label={t.diffTable} className="rounded border border-zinc-300 font-mono text-sm dark:border-zinc-700">
      <VirtualRows
        ref={listRef}
        role="rowgroup"
        count={items.length}
        render={(i) => {
          const it = items[i];
          if (it.kind === "gap") return <GapRow from={it.from} to={it.to} t={t} onExpand={onExpand} />;
          const r = rows[it.index];
          const kind = it.side === "left" ? "del" : "add";
          const side = it.side === "right" ? r.right! : r.left!;
          const bg = it.side === "both" ? "" : lineBg[kind];
          return (
            <div role="row" className={`${GRID} border-b border-zinc-100 dark:border-zinc-800 ${bg} ${isActive(active, it.index) ? activeRow : ""}`}>
              <div role="cell" className={num}>{it.side !== "right" && r.left?.num}</div>
              <div role="cell" className={num}>{it.side !== "left" && r.right?.num}</div>
              <div role="cell" className="select-none text-center text-zinc-500">{it.side !== "both" && <Sign kind={kind} t={t} />}</div>
              <div role="cell" className="whitespace-pre-wrap wrap-anywhere px-2">
                {it.side === "both" ? side.parts.map((p) => p.value).join("") : <Parts parts={side.parts} kind={kind} />}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
