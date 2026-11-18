// Pares [i, j] de linhas que aparecem uma única vez em a[aLo..aHi) e em b[bLo..bHi),
// em ordem crescente nos dois lados (LIS em O(n log n)). Base do "patience diff".
export function findAnchors(a: string[], aLo: number, aHi: number, b: string[], bLo: number, bHi: number): [number, number][] {
  const countA = new Map<string, number>();
  const countB = new Map<string, number>();
  const posB = new Map<string, number>();
  for (let i = aLo; i < aHi; i++) countA.set(a[i], (countA.get(a[i]) ?? 0) + 1);
  for (let j = bLo; j < bHi; j++) { countB.set(b[j], (countB.get(b[j]) ?? 0) + 1); posB.set(b[j], j); }
  const pairs: [number, number][] = [];
  for (let i = aLo; i < aHi; i++) if (countA.get(a[i]) === 1 && countB.get(a[i]) === 1) pairs.push([i, posB.get(a[i])!]);
  // LIS sobre j: tails[k] = índice em pairs da menor cauda de uma subsequência de tamanho k+1
  const tails: number[] = [];
  const prev = new Int32Array(pairs.length).fill(-1);
  for (let k = 0; k < pairs.length; k++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pairs[tails[m]][1] < pairs[k][1]) lo = m + 1; else hi = m; }
    if (lo > 0) prev[k] = tails[lo - 1];
    tails[lo] = k;
  }
  const out: [number, number][] = [];
  for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = prev[k]) out.push(pairs[k]);
  return out.reverse();
}
