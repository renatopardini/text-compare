"use client";

import type { Ref } from "react";
import type { Part, Row, RowType, Side } from "@/lib/diffRows";
import type { Messages } from "@/lib/i18n";
import type { ViewItem } from "@/lib/view";
import { VirtualRows, type VirtualRowsHandle } from "./VirtualRows";

export type ResultProps = {
  rows: Row[];
  t: Messages;
  active: [number, number] | null; // linhas [de, até) do bloco atual da navegação
  onExpand: (from: number) => void;
  listRef: Ref<VirtualRowsHandle>;
};

export const lineBg = { del: "bg-red-50 dark:bg-red-950/40", add: "bg-green-50 dark:bg-green-950/40" };
const wordBg = { del: "bg-red-300 dark:bg-red-800", add: "bg-green-300 dark:bg-green-800" };
export const activeRow = "shadow-[inset_4px_0_0_var(--color-blue-500)]";
export const isActive = (active: [number, number] | null, i: number) => !!active && i >= active[0] && i < active[1];

// Sinal visível + texto para leitor de tela, para não depender só da cor.
export function Sign({ kind, t }: { kind: "del" | "add"; t: Messages }) {
  return (
    <>
      <span aria-hidden="true" className="mr-1">{kind === "del" ? "−" : "+"}</span>
      <span className="sr-only">{kind === "del" ? t.removed : t.added} </span>
    </>
  );
}

// Palavras alteradas em <del>/<ins>: tachado/sublinhado além da cor, e anunciadas como "excluído"/"inserido".
export function Parts({ parts, kind }: { parts: Part[]; kind: "del" | "add" }) {
  return parts.map((p, i) =>
    !p.changed ? p.value : kind === "del" ? <del key={i} className={wordBg.del}>{p.value}</del> : <ins key={i} className={wordBg.add}>{p.value}</ins>,
  );
}

export function GapRow({ from, to, t, onExpand }: { from: number; to: number; t: Messages; onExpand: (from: number) => void }) {
  return (
    <div role="row" className="border-b border-zinc-100 dark:border-zinc-800">
      <div role="cell">
        <button
          className="w-full bg-zinc-50 py-1 text-center font-sans text-xs text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          onClick={() => onExpand(from)}
        >
          {t.gap(to - from)}
        </button>
      </div>
    </div>
  );
}

const divider = "border-l border-zinc-300 dark:border-zinc-700";

function Cells({ side, kind, type, t }: { side: Side; kind: "del" | "add"; type: RowType; t: Messages }) {
  const edge = kind === "add" ? divider : "";
  if (!side) return <div role="cell" className={`col-span-2 bg-zinc-100 dark:bg-zinc-800/50 ${edge}`} />;
  const diff = type !== "same";
  const bg = diff ? lineBg[kind] : "";
  return (
    <>
      <div role="cell" className={`select-none px-2 text-right text-zinc-400 ${bg} ${edge}`}>
        {diff && <Sign kind={kind} t={t} />}
        {side.num}
      </div>
      <div role="cell" className={`whitespace-pre-wrap wrap-anywhere px-2 ${bg}`}>
        <Parts parts={side.parts} kind={kind} />
      </div>
    </>
  );
}

const GRID = "grid grid-cols-[4rem_minmax(0,1fr)_4rem_minmax(0,1fr)]";

export function DiffTable({ rows, items, t, active, onExpand, listRef }: ResultProps & { items: ViewItem[] }) {
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
          return (
            <div
              role="row"
              className={`${GRID} border-b border-zinc-100 dark:border-zinc-800 ${isActive(active, it.index) ? activeRow : ""}`}
            >
              <Cells side={r.left} kind="del" type={r.type} t={t} />
              <Cells side={r.right} kind="add" type={r.type} t={t} />
            </div>
          );
        }}
      />
    </div>
  );
}
