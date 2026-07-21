import type { DurabilityExecutor } from "./types";
import { InactiveTransactionalExecutorError } from "../errors";

const TRANSACTIONAL_EXECUTOR = Symbol.for(
  "damatjs.durability.transactionalExecutor",
);

type MarkedExecutor = DurabilityExecutor & {
  [TRANSACTIONAL_EXECUTOR]?: TransactionState;
};

type AfterCommitCallback = () => void | Promise<void>;
interface TransactionState {
  active: boolean;
  afterCommit: Set<AfterCommitCallback>;
}

export function createTransactionalExecutor(
  target: DurabilityExecutor,
): DurabilityExecutor {
  const state: TransactionState = { active: true, afterCommit: new Set() };
  const executor: MarkedExecutor = {
    query: async (sql, params) => {
      if (!state.active) throw new InactiveTransactionalExecutorError();
      return target.query(sql, params);
    },
  };
  Object.defineProperty(executor, TRANSACTIONAL_EXECUTOR, {
    value: state,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return executor;
}

export function registerAfterCommit(
  executor: DurabilityExecutor,
  callback: AfterCommitCallback,
): boolean {
  const state = (executor as MarkedExecutor)[TRANSACTIONAL_EXECUTOR];
  if (!state?.active) return false;
  state.afterCommit.add(callback);
  return true;
}

export async function runAfterCommitCallbacks(
  executor: DurabilityExecutor,
): Promise<void> {
  const state = (executor as MarkedExecutor)[TRANSACTIONAL_EXECUTOR];
  if (!state) return;
  const callbacks = [...state.afterCommit];
  state.afterCommit.clear();
  await Promise.allSettled(callbacks.map((callback) => callback()));
}

export function isTransactionalExecutor(executor: DurabilityExecutor): boolean {
  return (executor as MarkedExecutor)[TRANSACTIONAL_EXECUTOR]?.active === true;
}

export function invalidateTransactionalExecutor(
  executor: DurabilityExecutor,
): void {
  const state = (executor as MarkedExecutor)[TRANSACTIONAL_EXECUTOR];
  if (state) state.active = false;
}
