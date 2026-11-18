import type { Row } from "./diffRows";

export type ViewItem =
  | { kind: "row"; index: number } // índice em rows
  | { kind: "gap"; from: number; to: number }; // linhas iguais recolhidas [from, to)

export type UnifiedItem =
  | { kind: "line"; index: number; side: "left" | "right" | "both" }
  | { kind: "gap"; from: number; to: number };

const MIN_RUN = 8;
const CONTEXT = 3;

// Recolhe sequências de "same" com >= 8 linhas, mantendo 3 de contexto antes e depois
// de cada diferença (no início/fim do texto, só o lado que encosta numa diferença).
// gaps cujo `from` está em `expanded` não são recolhidos. showAll = true desliga o recolhimento.
export function buildView(rows: Row[], expanded: ReadonlySet<number>, showAll: boolean): ViewItem[] {
  if (rows.every((r) => r.type === "same")) return [];
  const items: ViewItem[] = [];
  for (let i = 0; i < rows.length; ) {
    if (rows[i].type !== "same") { items.push({ kind: "row", index: i++ }); continue; }
    let end = i;
    while (end < rows.length && rows[end].type === "same") end++;
    const from = i > 0 ? i + CONTEXT : i;
    const to = end < rows.length ? end - CONTEXT : end;
    const collapse = !showAll && end - i >= MIN_RUN && !expanded.has(from);
    for (; i < end; i++) {
      if (collapse && i === from) { items.push({ kind: "gap", from, to }); i = to - 1; }
      else items.push({ kind: "row", index: i });
    }
  }
  return items;
}

// Modo unificado: "changed" vira duas linhas (− depois +), "removed" → left, "added" → right, "same" → both.
export function toUnified(view: ViewItem[], rows: Row[]): UnifiedItem[] {
  const out: UnifiedItem[] = [];
  for (const it of view) {
    if (it.kind === "gap") { out.push(it); continue; }
    const t = rows[it.index].type;
    if (t === "same") out.push({ kind: "line", index: it.index, side: "both" });
    if (t === "changed" || t === "removed") out.push({ kind: "line", index: it.index, side: "left" });
    if (t === "changed" || t === "added") out.push({ kind: "line", index: it.index, side: "right" });
  }
  return out;
}

// Posição (em view ou unified) do início de cada bloco, para a navegação ↑/↓.
export function hunkPositions(items: (ViewItem | UnifiedItem)[], hunks: number[]): number[] {
  const first = new Map<number, number>();
  items.forEach((it, p) => { if (it.kind !== "gap" && !first.has(it.index)) first.set(it.index, p); });
  return hunks.map((h) => first.get(h) ?? 0);
}
