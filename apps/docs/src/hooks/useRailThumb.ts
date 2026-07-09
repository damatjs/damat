"use client";

import { type RefObject, useEffect } from "react";

interface ThumbRect {
  top: number;
  height: number;
  indent: number;
}

/** Last thumb position per rail — survives component remounts (route
 *  navigation) so the bar animates from where it was, not from nothing. */
const lastRects = new Map<string, ThumbRect>();

/**
 * Drives the sliding rail indicator (`.rail-thumb`) inside a container.
 *
 * The container holds a `.rail-thumb` element and nav links; the link matching
 * `[data-active="true"]` is measured and its position written to CSS variables
 * on the container, which the thumb's stylesheet rules consume.
 *
 * Movement is Better-Auth style "stretch and settle": the bar first grows to
 * span from its previous position to the new one, then contracts onto the new
 * item. A link may set `data-rail-indent` (px) to jog the thumb right, e.g.
 * for nested TOC entries.
 *
 * `railId` keys the position memory; `activeKey` is anything that changes
 * when the active link changes (an id, a pathname).
 */
export function useRailThumb(
  containerRef: RefObject<HTMLElement | null>,
  railId: string,
  activeKey: string,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeKey intentionally re-runs the measurement when the active link changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let settleTimer: number | undefined;

    const rectOf = (el: HTMLElement): ThumbRect => {
      let top = 0;
      let node: HTMLElement | null = el;
      while (node && node !== container) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return {
        top: top + 4,
        height: el.offsetHeight - 8,
        indent: Number(el.dataset.railIndent ?? "0"),
      };
    };

    const apply = (rect: ThumbRect, opacity = "1") => {
      container.style.setProperty("--rail-thumb-top", `${rect.top}px`);
      container.style.setProperty("--rail-thumb-height", `${rect.height}px`);
      container.style.setProperty("--rail-thumb-left", `${rect.indent}px`);
      container.style.setProperty("--rail-thumb-opacity", opacity);
    };

    /** Set vars with transitions suppressed (e.g. restoring after a remount). */
    const applyInstant = (rect: ThumbRect, opacity = "1") => {
      container.style.setProperty("--rail-thumb-dur", "0s");
      apply(rect, opacity);
      void container.offsetHeight; // flush so the jump isn't animated
      container.style.removeProperty("--rail-thumb-dur");
    };

    const activeEl = () =>
      container.querySelector<HTMLElement>('[data-active="true"]');

    const move = () => {
      const active = activeEl();
      if (!active) {
        container.style.setProperty("--rail-thumb-opacity", "0");
        lastRects.delete(railId);
        return;
      }

      const target = rectOf(active);
      const prev = lastRects.get(railId);
      lastRects.set(railId, target);

      if (!prev) {
        applyInstant(target);
        return;
      }
      if (
        Math.abs(prev.top - target.top) < 1 &&
        Math.abs(prev.height - target.height) < 1
      ) {
        apply(target);
        return;
      }

      // 1) Restore the previous spot without animating (the node may be fresh
      //    after a route change), 2) stretch to span prev → target, 3) settle.
      applyInstant(prev);
      const top = Math.min(prev.top, target.top);
      const bottom = Math.max(
        prev.top + prev.height,
        target.top + target.height,
      );
      apply({ top, height: bottom - top, indent: target.indent });
      settleTimer = window.setTimeout(() => apply(target), 230);
    };

    const sync = () => {
      const active = activeEl();
      if (!active) return;
      const target = rectOf(active);
      lastRects.set(railId, target);
      applyInstant(target);
    };

    move();
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.clearTimeout(settleTimer);
    };
  }, [containerRef, railId, activeKey]);
}
