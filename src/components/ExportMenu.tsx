"use client";

import { useState } from "react";
import type { DiffResult, Row } from "@/lib/diffRows";
import { downloadFile, toHtml, toUnifiedPatch } from "@/lib/exportDiff";
import type { Messages } from "@/lib/i18n";
import type { ViewItem } from "@/lib/view";
import { buttonClass } from "./Toolbar";

type Props = {
  t: Messages;
  result: DiffResult;
  splitItems: ViewItem[]; // a visão lado a lado atual (com o recolhimento da tela)
  name: string; // arquivo original (nome usado no cabeçalho do patch)
  ignoring: boolean; // opções de ignorar ligadas: o patch é recalculado sem elas
  plainRows: () => Promise<Row[]>;
};

export function ExportMenu({ t, result, splitItems, name, ignoring, plainRows }: Props) {
  const [status, setStatus] = useState<"" | "copied" | "failed">("");
  const patch = async () => toUnifiedPatch(await plainRows(), name);
  const flash = (s: "copied" | "failed") => { setStatus(s); setTimeout(() => setStatus(""), 2000); };
  const small = buttonClass.replace("px-4 py-2", "px-3 py-1");

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
      <button
        className={small}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(await patch());
            flash("copied");
          } catch {
            flash("failed");
          }
        }}
      >
        {t.copyPatch}
      </button>
      <button className={small} onClick={async () => downloadFile(`${t.exportBaseName}.diff`, await patch(), "text/x-diff")}>
        {t.downloadDiff}
      </button>
      <button
        className={small}
        onClick={() => {
          const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
          downloadFile(`${t.exportBaseName}.html`, toHtml(result.rows, splitItems, result.stats, t, theme), "text/html");
        }}
      >
        {t.downloadHtml}
      </button>
      <span role="status" className={status === "failed" ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400"}>
        {status === "copied" ? t.copied : status === "failed" ? t.copyFailed : ""}
      </span>
      {ignoring && <span className="text-xs text-zinc-500">{t.patchNote}</span>}
    </div>
  );
}
