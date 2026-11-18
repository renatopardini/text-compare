import { computeDiff, type DiffOptions, type DiffResult } from "./diffRows.ts";

export type DiffRequest = { id: number; a: string; b: string; options: DiffOptions };
export type DiffResponse = { id: number; result: DiffResult };

// Responde em texto JSON: abrir com JSON.parse na página custa ~metade da cópia estruturada de milhares de objetos.
self.onmessage = (e: MessageEvent<DiffRequest>) => {
  const { id, a, b, options } = e.data;
  postMessage(JSON.stringify({ id, result: computeDiff(a, b, options) } satisfies DiffResponse));
};
