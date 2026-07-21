import { getDurabilityClient } from "../client/global";
import type { DurabilityExecutor } from "../client/types";

export async function cleanupPublishedAccelerationSignals(
  options: {
    executor?: DurabilityExecutor;
    limit?: number;
    before?: Date;
  } = {},
): Promise<number> {
  const limit = options.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("acceleration cleanup limit must be between 1 and 1000");
  }
  const executor = options.executor ?? getDurabilityClient();
  const before = options.before ?? new Date(Date.now() - 7_776_000_000);
  const result = await executor.query(
    `DELETE FROM "_damat_acceleration_outbox" WHERE "id" IN
       (SELECT "id" FROM "_damat_acceleration_outbox"
        WHERE "published_at" IS NOT NULL AND "published_at"<$1
        ORDER BY "published_at","revision" LIMIT $2)`,
    [before, limit],
  );
  return result.rowCount ?? 0;
}
