import { EventBus } from "./bus";

// The bus lives on globalThis (like PoolManager) so two copies of this
// package in one process — a linked dev copy next to an installed one —
// still share a single subscription table.
const BUS_KEY = Symbol.for("damatjs.events.bus");

function holder(): { bus?: EventBus } {
  const g = globalThis as Record<symbol, { bus?: EventBus } | undefined>;
  if (!g[BUS_KEY]) g[BUS_KEY] = {};
  return g[BUS_KEY];
}

/** The process-wide bus (created on first use). */
export function getEventBus(): EventBus {
  const h = holder();
  if (!h.bus) h.bus = new EventBus();
  return h.bus;
}

/** Swap the global bus (tests). */
export function setEventBus(bus: EventBus): void {
  holder().bus = bus;
}

/** Drop the global bus and all its subscriptions (tests / shutdown). */
export function resetEventBus(): void {
  delete holder().bus;
}
