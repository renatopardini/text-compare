"use client";

import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";

// Até 2.000 itens desenha tudo (mantém Ctrl+F do navegador); acima disso, só o que está visível.
const VIRTUALIZE_ABOVE = 2000;

export type VirtualRowsHandle = { scrollToItem(i: number): void };

type Props = {
  count: number;
  render: (i: number) => ReactNode;
  ref?: Ref<VirtualRowsHandle>;
  role?: string;
  className?: string;
};

export function VirtualRows({ count, render, ref, role, className }: Props) {
  const virtual = count > VIRTUALIZE_ABOVE;
  const el = useRef<HTMLDivElement | null>(null);
  // A página inteira rola, então a lista precisa saber onde começa (muda quando os campos de texto mudam de tamanho).
  const [margin, setMargin] = useState(0);
  const listRef = useCallback((node: HTMLDivElement | null) => {
    el.current = node;
    if (!node) return;
    const ro = new ResizeObserver(() => setMargin(node.getBoundingClientRect().top + window.scrollY));
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const v = useWindowVirtualizer({ count, estimateSize: () => 24, overscan: 20, scrollMargin: margin, enabled: virtual });

  useImperativeHandle(
    ref,
    () => ({
      scrollToItem(i) {
        if (virtual) v.scrollToIndex(i, { align: "center" });
        else el.current?.querySelector(`[data-index="${i}"]`)?.scrollIntoView({ block: "center" });
      },
    }),
    [virtual, v],
  );

  if (!virtual)
    return (
      <div ref={listRef} role={role} className={className}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} data-index={i}>
            {render(i)}
          </div>
        ))}
      </div>
    );

  return (
    <div ref={listRef} role={role} className={className} style={{ height: v.getTotalSize(), position: "relative" }}>
      {v.getVirtualItems().map((it) => (
        <div
          key={it.key}
          data-index={it.index}
          ref={v.measureElement}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${it.start - margin}px)` }}
        >
          {render(it.index)}
        </div>
      ))}
    </div>
  );
}
