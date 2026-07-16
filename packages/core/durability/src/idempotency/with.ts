import { getDurabilityClient } from "../client/global";
import type { DurabilityExecutor } from "../client/types";
import { beginIdempotency } from "./begin";
import { completeIdempotency } from "./complete";
import type { IdempotencyOptions, IdempotencyResult, JsonValue } from "./types";

export async function withIdempotency<T extends JsonValue>(
  options: IdempotencyOptions,
  operation: (executor: DurabilityExecutor) => Promise<T>,
): Promise<IdempotencyResult<T>> {
  const execute = async (
    executor: DurabilityExecutor,
  ): Promise<IdempotencyResult<T>> => {
    const claim = await beginIdempotency(executor, options);
    if (!claim.acquired) {
      return { value: claim.value as T, replayed: true };
    }
    const value = await operation(executor);
    await completeIdempotency(executor, options.scope, options.key, value);
    return { value, replayed: false };
  };

  if (options.executor) return execute(options.executor);
  return getDurabilityClient().transaction(execute);
}
