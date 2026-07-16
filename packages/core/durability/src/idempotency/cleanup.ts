import { getDurabilityClient } from "../client/global";
import type { DurabilityExecutor } from "../client/types";

export interface CleanupIdempotencyOptions {
  before?: Date;
  limit?: number;
  executor?: DurabilityExecutor;
}

export async function cleanupExpiredIdempotency(
  options: CleanupIdempotencyOptions = {},
): Promise<number> {
  const limit = options.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new Error(
      "idempotency cleanup limit must be a positive safe integer",
    );
  }
  const executor = options.executor ?? getDurabilityClient();
  const result = await executor.query(
    `DELETE FROM "_damat_idempotency_keys" WHERE ("scope","key") IN (
       SELECT "scope","key" FROM "_damat_idempotency_keys"
       WHERE "expires_at" IS NOT NULL AND "expires_at" <= $1
       ORDER BY "expires_at","scope","key" LIMIT $2)`,
    [options.before ?? new Date(), Math.min(limit, 500)],
  );
  return result.rowCount ?? 0;
}
