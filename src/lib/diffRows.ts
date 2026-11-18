import { diffLines, diffWordsWithSpace } from "diff";

export type Part = { value: string; changed: boolean };
export type Side = { num: number; parts: Part[] } | null;
export type Row = { type: "same" | "changed"; left: Side; right: Side };

// Unifica quebras de linha e garante "\n" final, senão a última linha sempre aparece como alterada.
const normalize = (s: string) => s.replace(/\r\n?/g, "\n").replace(/\n?$/, "\n");
const toLines = (s: string) => s.replace(/\n$/, "").split("\n");
const plain = (value: string): Part[] => [{ value, changed: false }];

// Monta as linhas do diff lado a lado; linhas alteradas em par recebem destaque por palavra.
export function diffRows(a: string, b: string): Row[] {
  const chunks = diffLines(normalize(a), normalize(b));
  const rows: Row[] = [];
  let l = 0;
  let r = 0;

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (!c.added && !c.removed) {
      for (const t of toLines(c.value)) {
        rows.push({ type: "same", left: { num: ++l, parts: plain(t) }, right: { num: ++r, parts: plain(t) } });
      }
      continue;
    }

    // jsdiff sempre emite "removed" antes de "added" quando um bloco foi substituído.
    const del = c.removed ? toLines(c.value) : [];
    let add: string[] = [];
    if (c.added) add = toLines(c.value);
    else if (chunks[i + 1]?.added) add = toLines(chunks[++i].value);

    for (let k = 0; k < Math.max(del.length, add.length); k++) {
      const o = del[k];
      const n = add[k];
      let left: Side = null;
      let right: Side = null;
      if (o !== undefined && n !== undefined) {
        const words = diffWordsWithSpace(o, n);
        left = { num: ++l, parts: words.filter((p) => !p.added).map((p) => ({ value: p.value, changed: !!p.removed })) };
        right = { num: ++r, parts: words.filter((p) => !p.removed).map((p) => ({ value: p.value, changed: !!p.added })) };
      } else if (o !== undefined) {
        left = { num: ++l, parts: plain(o) };
      } else {
        right = { num: ++r, parts: plain(n) };
      }
      rows.push({ type: "changed", left, right });
    }
  }
  return rows;
}
