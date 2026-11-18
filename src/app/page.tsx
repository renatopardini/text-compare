"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DiffSummary } from "@/components/DiffSummary";
import { DiffTable } from "@/components/DiffTable";
import { ExportMenu } from "@/components/ExportMenu";
import { LangToggle } from "@/components/LangToggle";
import { Loader } from "@/components/Loader";
import { TextInput, type FileInfo } from "@/components/TextInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toolbar } from "@/components/Toolbar";
import { UnifiedView } from "@/components/UnifiedView";
import type { VirtualRowsHandle } from "@/components/VirtualRows";
import { diffOnce, useDiff } from "@/hooks/useDiff";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePrefs } from "@/hooks/usePrefs";
import { decodeFile } from "@/lib/decodeFile";
import type { DiffOptions, DiffResult } from "@/lib/diffRows";
import { messages } from "@/lib/i18n";
import type { Prefs } from "@/lib/prefs";
import { buildView, hunkPositions, toUnified } from "@/lib/view";

type SideName = "left" | "right";
type Files = Record<SideName, FileInfo>;
// Estado da visualização vale só para o resultado em que foi criado; um resultado novo volta ao padrão.
type ViewState = { for: DiffResult | null; expanded: ReadonlySet<number>; showAll: boolean; current: number };

const NO_FILES: Files = { left: {}, right: {} };
const EMPTY = new Set<number>();

export default function Home() {
  const [prefs, setPrefs] = usePrefs();
  const t = messages[prefs.lang];
  const options: DiffOptions = { ignoreWhitespace: prefs.ignoreWhitespace, ignoreCase: prefs.ignoreCase };
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [files, setFiles] = useState<Files>(NO_FILES);
  const { result, showLoader, schedule, compareNow } = useDiff();
  const narrow = useMediaQuery("(max-width: 767px)");
  const unified = prefs.view === "unified" || (prefs.view === "auto" && narrow);
  const listRef = useRef<VirtualRowsHandle>(null);

  const [viewState, setViewState] = useState<ViewState>({ for: null, expanded: EMPTY, showAll: false, current: -1 });
  const vs: ViewState = viewState.for === result ? viewState : { for: result, expanded: EMPTY, showAll: false, current: -1 };

  const splitItems = useMemo(() => (result ? buildView(result.rows, vs.expanded, vs.showAll) : []), [result, vs.expanded, vs.showAll]);
  const unifiedItems = useMemo(() => (result && unified ? toUnified(splitItems, result.rows) : null), [result, unified, splitItems]);
  const positions = useMemo(() => (result ? hunkPositions(unifiedItems ?? splitItems, result.hunks) : []), [result, unifiedItems, splitItems]);

  const update = (side: SideName, value: string) => {
    if (side === "left") setLeft(value);
    else setRight(value);
    if (files[side].error) setFiles({ ...files, [side]: { ...files[side], error: undefined } });
    schedule(side === "left" ? value : left, side === "right" ? value : right, options);
  };

  const openFiles = async (side: SideName, list: File[]) => {
    // Dois arquivos de uma vez: o primeiro vai para a esquerda e o segundo para a direita.
    const targets: [SideName, File][] = list.length >= 2 ? [["left", list[0]], ["right", list[1]]] : [[side, list[0]]];
    const text = { left, right };
    const next = { ...files };
    for (const [s, f] of targets) {
      try {
        const r = await decodeFile(f);
        text[s] = r.text;
        next[s] = { name: f.name, encoding: r.encoding };
      } catch (e) {
        next[s] = { ...next[s], error: e instanceof Error ? e.message : "" };
      }
    }
    setLeft(text.left);
    setRight(text.right);
    setFiles(next);
    compareNow(text.left, text.right, options);
  };

  const swap = () => {
    setLeft(right);
    setRight(left);
    setFiles({ left: files.right, right: files.left });
    compareNow(right, left, options);
  };

  const clear = () => {
    setLeft("");
    setRight("");
    setFiles(NO_FILES);
    compareNow("", "", options);
  };

  const changePrefs = (patch: Partial<Prefs>) => {
    setPrefs(patch);
    if ("ignoreWhitespace" in patch || "ignoreCase" in patch) compareNow(left, right, { ...options, ...patch });
  };

  const goTo = (dir: 1 | -1) => {
    const n = positions.length;
    if (!n) return;
    const k = dir === 1 ? (vs.current + 1) % n : vs.current <= 0 ? n - 1 : vs.current - 1;
    setViewState({ ...vs, current: k });
    listRef.current?.scrollToItem(positions[k]);
  };

  // Atalhos globais: Ctrl+Enter compara na hora; F7/Shift+F7 navegam (fora dos campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        compareNow(left, right, options);
      } else if (e.key === "F7" && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        goTo(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Arquivo solto fora dos campos não deve abrir no lugar do app.
  useEffect(() => {
    const block = (e: globalThis.DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
  }, [t]);

  const resultProps = result && {
    rows: result.rows,
    t,
    active: vs.current >= 0 ? hunkRange(result, vs.current) : null,
    onExpand: (from: number) => setViewState({ ...vs, expanded: new Set(vs.expanded).add(from) }),
    listRef,
  };

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
      <title>{t.title}</title>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-semibold">{t.title}</h1>
        <LangToggle lang={prefs.lang} t={t} onChange={(lang) => changePrefs({ lang })} />
        <ThemeToggle theme={prefs.theme} t={t} onChange={(theme) => changePrefs({ theme })} />
      </div>
      <p className="mb-4 text-sm text-zinc-500">{t.privacy}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label={t.original} value={left} file={files.left} t={t} onChange={(v) => update("left", v)} onFiles={(f) => openFiles("left", f)} />
        <TextInput label={t.changed} value={right} file={files.right} t={t} onChange={(v) => update("right", v)} onFiles={(f) => openFiles("right", f)} />
      </div>

      <Toolbar t={t} prefs={prefs} onCompare={() => compareNow(left, right, options)} onSwap={swap} onClear={clear} onPrefs={changePrefs} />

      {showLoader && <Loader label={t.comparing} />}
      {result && resultProps && (
        <section aria-busy={showLoader} className={showLoader ? "opacity-50" : ""}>
          {result.hunks.length === 0 ? (
            <p className="rounded bg-green-100 p-3 text-green-900 dark:bg-green-900/40 dark:text-green-200">{t.identical}</p>
          ) : (
            <>
              <DiffSummary
                stats={result.stats}
                approximate={result.approximate}
                t={t}
                current={vs.current}
                total={positions.length}
                onPrev={() => goTo(-1)}
                onNext={() => goTo(1)}
                showAll={vs.showAll}
                onShowAll={(showAll) => setViewState({ ...vs, showAll })}
              />
              <ExportMenu
                t={t}
                result={result}
                splitItems={splitItems}
                name={files.left.name ?? t.defaultNameA}
                ignoring={!!(options.ignoreWhitespace || options.ignoreCase)}
                plainRows={async () => (options.ignoreWhitespace || options.ignoreCase ? (await diffOnce(left, right, {})).rows : result.rows)}
              />
              {unifiedItems ? <UnifiedView {...resultProps} items={unifiedItems} /> : <DiffTable {...resultProps} items={splitItems} />}
            </>
          )}
        </section>
      )}
    </main>
  );
}

// Linhas [de, até) do bloco k: do início até a próxima linha igual.
function hunkRange(result: DiffResult, k: number): [number, number] {
  const from = result.hunks[k];
  let to = from;
  while (to < result.rows.length && result.rows[to].type !== "same") to++;
  return [from, to];
}
