"use client";

import { useRef } from "react";
import type { TocEntry } from "@/lib/types";
import { useTocFlow } from "@/modules/docs/components/tocRail/hook";

/** "On this page" — a bent SVG rail whose highlighted stretch flows with the
 *  sections currently on screen (Better-Auth style). */
export function TocRail({ toc }: { toc: TocEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<SVGPathElement>(null);
  const activeRef = useRef<SVGPathElement>(null);

  const [first, last] = useTocFlow(containerRef, railRef, activeRef, toc);

  if (toc.length < 2) return null;

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 overflow-y-auto py-10 xl:block">
      <p className="text-xs font-semibold text-ink">On this page</p>
      <div ref={containerRef} className="relative mt-3">
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-6"
          aria-hidden="true"
        >
          <path ref={railRef} className="toc-rail-line" />
          <path ref={activeRef} className="toc-rail-active" />
        </svg>
        <ul className="flex flex-col">
          {toc.map((entry, i) => {
            const active = i >= first && i <= last;
            return (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  data-toc-link
                  className={`block py-1 pr-2 text-code leading-snug transition-colors ${
                    entry.depth === 3 ? "pl-7" : "pl-3.5"
                  } ${active ? "font-medium text-ink" : "text-muted hover:text-ink"}`}
                >
                  {entry.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
