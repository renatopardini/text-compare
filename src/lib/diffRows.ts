import { diffArrays, diffWords, diffWordsWithSpace } from "diff";
import { findAnchors } from "./anchors.ts";

export type Part = { value: string; changed: boolean };
export type Side = { num: number; parts: Part[] } | null;
export type RowType = "same" | "changed" | "removed" | "added";
export type Row = { type: RowType; left: Side; right: Side };
export type DiffOptions = { ignoreWhitespace?: boolean; ignoreCase?: boolean };
export type DiffStats = { changed: number; removed: number; added: number };
export type DiffResult = {
  rows: Row[];
  stats: DiffStats;
  hunks: number[]; // índice em rows da 1ª linha de cada bloco de diferença
  approximate: boolean; // true se algum trecho estourou o limite de tempo
};

const TIME_LIMIT_MS = 2000;

// Unifica quebras de linha e separa em linhas; o "\n" final é opcional, senão a última linha sempre apareceria como alterada.
// Texto vazio = zero linhas.
export const toLines = (s: string) => (s === "" ? [] : s.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n"));
const plain = (value: string): Part[] => [{ value, changed: false }];

export function computeDiff(a: string, b: string, options: DiffOptions = {}): DiffResult {
  const { ignoreWhitespace = false, ignoreCase = false } = options;
  const A = toLines(a);
  const B = toLines(b);
  const key = (s: string) => {
    if (ignoreWhitespace) s = s.replace(/\s+/g, " ").trim();
    return ignoreCase ? s.toLowerCase() : s;
  };
  const ka = ignoreWhitespace || ignoreCase ? A.map(key) : A;
  const kb = ignoreWhitespace || ignoreCase ? B.map(key) : B;
  const deadline = performance.now() + TIME_LIMIT_MS;
  let approximate = false;

  const rows: Row[] = [];
  const dels: number[] = [];
  const adds: number[] = [];

  // Destaque por palavra. Com opções de ignorar, o "diff" devolve a parte comum com o texto do lado novo,
  // então o lado esquerdo sai de um segundo diff invertido.
  const wordDiff = ignoreWhitespace ? diffWords : diffWordsWithSpace;
  const sideParts = (from: string, to: string): Part[] | undefined =>
    wordDiff(from, to, { ignoreCase, timeout: 100 })?.filter((p) => !p.removed).map((p) => ({ value: p.value, changed: p.added }));
  const pairParts = (o: string, n: string): [Part[], Part[]] => {
    if (!ignoreWhitespace && !ignoreCase) {
      const words = diffWordsWithSpace(o, n, { timeout: 100 });
      if (words)
        return [
          words.filter((p) => !p.added).map((p) => ({ value: p.value, changed: p.removed })),
          words.filter((p) => !p.removed).map((p) => ({ value: p.value, changed: p.added })),
        ];
    } else {
      const left = sideParts(n, o);
      const right = left && sideParts(o, n);
      if (left && right) return [left, right];
    }
    return [[{ value: o, changed: true }], [{ value: n, changed: true }]];
  };

  // Pareia o k-ésimo removido com o k-ésimo adicionado; as sobras ficam só de um lado.
  const flush = () => {
    for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
      const i = dels[k];
      const j = adds[k];
      if (i !== undefined && j !== undefined) {
        const [lp, rp] = pairParts(A[i], B[j]);
        rows.push({ type: "changed", left: { num: i + 1, parts: lp }, right: { num: j + 1, parts: rp } });
      } else if (i !== undefined) rows.push({ type: "removed", left: { num: i + 1, parts: plain(A[i]) }, right: null });
      else rows.push({ type: "added", left: null, right: { num: j + 1, parts: plain(B[j]) } });
    }
    dels.length = 0;
    adds.length = 0;
  };
  const same = (i: number, j: number) => {
    if (dels.length || adds.length) flush();
    rows.push({ type: "same", left: { num: i + 1, parts: plain(A[i]) }, right: { num: j + 1, parts: plain(B[j]) } });
  };
  const replace = (aLo: number, aHi: number, bLo: number, bHi: number) => {
    for (let i = aLo; i < aHi; i++) dels.push(i);
    for (let j = bLo; j < bHi; j++) adds.push(j);
  };

  // A recursão sempre consome ao menos uma âncora ou termina; na prática a profundidade é pequena.
  const diffRange = (aLo: number, aHi: number, bLo: number, bHi: number) => {
    while (aLo < aHi && bLo < bHi && ka[aLo] === kb[bLo]) same(aLo++, bLo++);
    let sa = aHi, sb = bHi;
    while (sa > aLo && sb > bLo && ka[sa - 1] === kb[sb - 1]) { sa--; sb--; }
    middle(aLo, sa, bLo, sb);
    for (let k = 0; k < aHi - sa; k++) same(sa + k, sb + k);
  };
  const middle = (aLo: number, aHi: number, bLo: number, bHi: number) => {
    if (aLo === aHi || bLo === bHi) return replace(aLo, aHi, bLo, bHi);
    if (performance.now() > deadline) { approximate = true; return replace(aLo, aHi, bLo, bHi); }
    const anchors = findAnchors(ka, aLo, aHi, kb, bLo, bHi);
    if (anchors.length) {
      let i = aLo, j = bLo;
      for (const [ai, bj] of anchors) { diffRange(i, ai, j, bj); same(ai, bj); i = ai + 1; j = bj + 1; }
      return diffRange(i, aHi, j, bHi);
    }
    const changes = diffArrays(ka.slice(aLo, aHi), kb.slice(bLo, bHi), { timeout: Math.max(20, deadline - performance.now()) });
    if (!changes) { approximate = true; return replace(aLo, aHi, bLo, bHi); }
    let i = aLo, j = bLo;
    for (const c of changes) {
      for (let k = 0; k < c.count; k++) {
        if (c.removed) dels.push(i++);
        else if (c.added) adds.push(j++);
        else same(i++, j++);
      }
    }
  };

  diffRange(0, A.length, 0, B.length);
  flush();

  const stats: DiffStats = { changed: 0, removed: 0, added: 0 };
  const hunks: number[] = [];
  rows.forEach((r, i) => {
    if (r.type === "same") return;
    stats[r.type]++;
    if (i === 0 || rows[i - 1].type === "same") hunks.push(i);
  });
  return { rows, stats, hunks, approximate };
}

// Atalho mantido para os testes e usos simples.
export function diffRows(a: string, b: string): Row[] {
  return computeDiff(a, b, {}).rows;
}
