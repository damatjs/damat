import type { DurableInvalidation } from "./types";

type InvalidationListener = (event: DurableInvalidation) => void;
const listeners = new Set<InvalidationListener>();

export function subscribeDurableInvalidations(
  listener: InvalidationListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDurableInvalidation(event: DurableInvalidation): void {
  for (const listener of listeners) listener(event);
}

export function clearDurableInvalidationListeners(): void {
  listeners.clear();
}
