import { useCallback, useEffect, useRef, useState } from "react";
import { computeDiff, type DiffOptions, type DiffResult } from "@/lib/diffRows";
import type { DiffRequest, DiffResponse } from "@/lib/diff.worker";

const DEBOUNCE_MS = 300;
const LOADER_MS = 150;
const newWorker = () => new Worker(new URL("../lib/diff.worker.ts", import.meta.url));
type Timer = ReturnType<typeof setTimeout> | undefined;

// Cálculo avulso num worker descartável (ex.: patch sem as opções de ignorar), sem interferir no principal.
export function diffOnce(a: string, b: string, options: DiffOptions): Promise<DiffResult> {
  if (typeof Worker === "undefined") return Promise.resolve(computeDiff(a, b, options));
  return new Promise((resolve) => {
    const w = newWorker();
    const done = (r: DiffResult) => { w.terminate(); resolve(r); };
    w.onmessage = (e: MessageEvent<string>) => done((JSON.parse(e.data) as DiffResponse).result);
    w.onerror = () => done(computeDiff(a, b, options));
    w.postMessage({ id: 0, a, b, options } satisfies DiffRequest);
  });
}

// Comparação em segundo plano: o último pedido sempre vence e um resultado antigo nunca substitui um mais novo.
// schedule/compareNow devem ser chamados em handlers de evento (não em efeitos).
export function useDiff() {
  const [result, setResult] = useState<DiffResult | null>(null);
  const [pending, setPending] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const s = useRef({
    worker: null as Worker | null,
    busy: false,
    id: 0,
    last: null as DiffRequest | null,
    debounce: undefined as Timer,
    loader: undefined as Timer,
  });

  useEffect(() => {
    const st = s.current;
    return () => {
      st.worker?.terminate();
      clearTimeout(st.debounce);
      clearTimeout(st.loader);
    };
  }, []);

  const finish = useCallback((r: DiffResult | null) => {
    clearTimeout(s.current.loader);
    setResult(r);
    setPending(false);
    setShowLoader(false);
  }, []);

  const compareNow = useCallback(
    (a: string, b: string, options: DiffOptions) => {
      const st = s.current;
      clearTimeout(st.debounce);
      const id = ++st.id;
      if (!a && !b) return finish(null);
      setPending(true);
      clearTimeout(st.loader);
      st.loader = setTimeout(() => setShowLoader(true), LOADER_MS);
      if (typeof Worker === "undefined") return finish(computeDiff(a, b, options));
      // Worker ocupado com um pedido velho: descarta e cria outro, em vez de esperar.
      if (st.busy) { st.worker?.terminate(); st.worker = null; }
      if (!st.worker) {
        const w = newWorker();
        w.onmessage = (e: MessageEvent<string>) => {
          st.busy = false;
          const res = JSON.parse(e.data) as DiffResponse;
          if (res.id === st.id) finish(res.result);
        };
        // Se o worker não carregar, calcula na thread principal (alternativa de segurança).
        w.onerror = () => {
          st.busy = false;
          st.worker = null;
          const l = st.last;
          if (l && l.id === st.id) finish(computeDiff(l.a, l.b, l.options));
        };
        st.worker = w;
      }
      st.busy = true;
      st.last = { id, a, b, options };
      st.worker.postMessage(st.last);
    },
    [finish],
  );

  const schedule = useCallback(
    (a: string, b: string, options: DiffOptions) => {
      const st = s.current;
      clearTimeout(st.debounce);
      st.id++; // invalida respostas de pedidos anteriores
      setPending(true);
      st.debounce = setTimeout(() => compareNow(a, b, options), DEBOUNCE_MS);
    },
    [compareNow],
  );

  return { result, pending, showLoader, schedule, compareNow };
}
