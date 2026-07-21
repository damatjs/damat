import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
} from "@damatjs/durability";

export function scheduleTransaction<T>(
  executor: DurabilityExecutor | undefined,
  operation: (executor: DurabilityExecutor) => Promise<T>,
): Promise<T> {
  if (!executor) return getDurabilityClient().transaction(operation);
  if (!isTransactionalExecutor(executor)) {
    throw new TransactionalExecutorRequiredError();
  }
  return operation(executor);
}
