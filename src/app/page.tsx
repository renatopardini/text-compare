"use client";

import { useState } from "react";
import { diffRows, type Row, type Side } from "@/lib/diffRows";

const textareaClass =
  "h-72 w-full resize-y rounded border border-zinc-300 bg-white p-3 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-900";
const buttonClass = "rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";

function Cells({ side, kind, changed }: { side: Side; kind: "del" | "add"; changed: boolean }) {
  if (!side) return <td colSpan={2} className="bg-zinc-100 dark:bg-zinc-800/50" />;
  const line = !changed ? "" : kind === "del" ? "bg-red-50 dark:bg-red-950/40" : "bg-green-50 dark:bg-green-950/40";
  const word = kind === "del" ? "bg-red-300 dark:bg-red-800" : "bg-green-300 dark:bg-green-800";
  return (
    <>
      <td className={`select-none px-2 text-right align-top text-zinc-400 ${line}`}>{side.num}</td>
      <td className={`whitespace-pre-wrap break-all px-2 align-top ${line}`}>
        {side.parts.map((p, i) => (p.changed ? <mark key={i} className={`${word} text-inherit`}>{p.value}</mark> : p.value))}
      </td>
    </>
  );
}

export default function Home() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  const changed = rows?.filter((r) => r.type === "changed") ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Comparar textos</h1>
      <p className="mb-4 text-sm text-zinc-500">A comparação roda no seu navegador. Nenhum texto é enviado a servidor algum.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Texto original
          <textarea className={textareaClass} value={left} onChange={(e) => setLeft(e.target.value)} spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Texto alterado
          <textarea className={textareaClass} value={right} onChange={(e) => setRight(e.target.value)} spellCheck={false} />
        </label>
      </div>

      <div className="my-4 flex flex-wrap gap-2">
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setRows(diffRows(left, right))}>
          Comparar
        </button>
        <button className={buttonClass} onClick={() => { setLeft(right); setRight(left); setRows(null); }}>
          Inverter
        </button>
        <button className={buttonClass} onClick={() => { setLeft(""); setRight(""); setRows(null); }}>
          Limpar
        </button>
      </div>

      {rows && (changed.length === 0 ? (
        <p className="rounded bg-green-100 p-3 text-green-900 dark:bg-green-900/40 dark:text-green-200">Os textos são idênticos.</p>
      ) : (
        <>
          <p className="mb-2 text-sm text-zinc-500">
            {changed.filter((r) => r.left).length} linha(s) removida(s) ou alterada(s) · {changed.filter((r) => r.right).length} linha(s) adicionada(s) ou alterada(s)
          </p>
          <div className="overflow-x-auto rounded border border-zinc-300 dark:border-zinc-700">
            <table className="w-full table-fixed border-collapse font-mono text-sm">
              <colgroup><col className="w-12" /><col /><col className="w-12 border-l border-zinc-300 dark:border-zinc-700" /><col /></colgroup>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <Cells side={r.left} kind="del" changed={r.type === "changed"} />
                    <Cells side={r.right} kind="add" changed={r.type === "changed"} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ))}
    </main>
  );
}
