"use client";

import { type RefObject, useEffect, useState } from "react";
import type { TocEntry } from "@/lib/types";

const BASE_X = 1; // rail x for h2 entries
const INDENT_X = 15; // rail x for h3 entries — the bend target
const BEND = 8; // bend radius where the rail changes indent
const INSET = 3; // px trimmed from each item's ends on the rail
const VIEW_TOP = 96; // sticky header offset

interface Segment {
  start: number;
  end: number;
}

/**
 * Fumadocs/Better-Auth style TOC flow: builds one SVG path that runs down the
 * list and bends around indented entries, then highlights the stretch of it
 * covering the sections currently on screen (via stroke-dasharray written to
 * the `--toc-dash` variable). Returns the [first, last] visible entry indexes
 * so the list can brighten the same range.
 */
export function useTocFlow(
  containerRef: RefObject<HTMLDivElement | null>,
  railRef: RefObject<SVGPathElement | null>,
  activeRef: RefObject<SVGPathElement | null>,
  toc: TocEntry[],
): [number, number] {
  const [range, setRange] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const container = containerRef.current;
    const rail = railRef.current;
    const glow = activeRef.current;
    if (!container || !rail || !glow || toc.length === 0) return;

    let segments: Segment[] = [];
    let raf = 0;

    const measure = () => {
      const anchors = Array.from(
        container.querySelectorAll<HTMLAnchorElement>("a[data-toc-link]"),
      );
      if (anchors.length === 0) return;

      const points = anchors.map((a, i) => ({
        x: toc[i]?.depth === 3 ? INDENT_X : BASE_X,
        top: a.offsetTop + INSET,
        bottom: a.offsetTop + a.offsetHeight - INSET,
      }));

      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      if (!firstPoint || !lastPoint) return;

      let d = `M ${firstPoint.x} ${firstPoint.top}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        if (!prev || !cur) continue;
        if (cur.x !== prev.x) {
          // S-bend in the gap above the entry that changes indent.
          const y = cur.top - 1;
          d += ` L ${prev.x} ${y - BEND} C ${prev.x} ${y}, ${cur.x} ${y}, ${cur.x} ${y + BEND}`;
        }
      }
      d += ` L ${lastPoint.x} ${lastPoint.bottom}`;
      rail.setAttribute("d", d);
      glow.setAttribute("d", d);

      // Map each entry's y-range to lengths along the (y-monotonic) path.
      const total = rail.getTotalLength();
      const lengthAtY = (y: number) => {
        let lo = 0;
        let hi = total;
        for (let i = 0; i < 22; i++) {
          const mid = (lo + hi) / 2;
          if (rail.getPointAtLength(mid).y < y) lo = mid;
          else hi = mid;
        }
        return (lo + hi) / 2;
      };
      segments = points.map((p) => ({
        start: lengthAtY(p.top),
        end: lengthAtY(p.bottom),
      }));
      update();
    };

    const update = () => {
      if (segments.length === 0) return;
      const headings = toc.map((t) => document.getElementById(t.id));
      const viewBottom = window.innerHeight;
      let first = -1;
      let last = -1;
      for (let i = 0; i < headings.length; i++) {
        const el = headings[i];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        const next = headings
          .slice(i + 1)
          .find((h): h is HTMLElement => h !== null);
        const sectionBottom = next
          ? next.getBoundingClientRect().top
          : document.documentElement.scrollHeight - window.scrollY;
        if (sectionBottom > VIEW_TOP && top < viewBottom) {
          if (first === -1) first = i;
          last = i;
        }
      }
      if (first === -1) return;
      const startSegment = segments[first];
      const endSegment = segments[last];
      if (!startSegment || !endSegment) return;
      const start = startSegment.start;
      const end = endSegment.end;
      container.style.setProperty(
        "--toc-dash",
        `0 ${start.toFixed(1)} ${(end - start).toFixed(1)} 99999`,
      );
      setRange((prev) =>
        prev[0] === first && prev[1] === last ? prev : [first, last],
      );
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
    };
  }, [containerRef, railRef, activeRef, toc]);

  return range;
}
