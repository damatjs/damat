import type { DurabilityExecutor } from "./types";

const TRANSACTIONAL_EXECUTOR = Symbol.for(
  "damatjs.durability.transactionalExecutor",
);

type MarkedExecutor = DurabilityExecutor & {
  [TRANSACTIONAL_EXECUTOR]?: { active: boolean };
};

export function markTransactionalExecutor<T extends DurabilityExecutor>(
  executor: T,
): T {
  const marked = executor as MarkedExecutor;
  const state = marked[TRANSACTIONAL_EXECUTOR];
  if (state) {
    state.active = true;
  } else {
    Object.defineProperty(executor, TRANSACTIONAL_EXECUTOR, {
      value: { active: true },
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return executor;
}

export function isTransactionalExecutor(executor: DurabilityExecutor): boolean {
  return (executor as MarkedExecutor)[TRANSACTIONAL_EXECUTOR]?.active === true;
}

export function unmarkTransactionalExecutor(
  executor: DurabilityExecutor,
): void {
  const state = (executor as MarkedExecutor)[TRANSACTIONAL_EXECUTOR];
  if (state) state.active = false;
}
