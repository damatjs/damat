import { getDurabilityClient } from "../client/global";
import { isTransactionalExecutor } from "../client/transactional";
import type { DurabilityExecutor } from "../client/types";
import { TransactionalExecutorRequiredError } from "../errors";
import type { ChangeWorkControlOptions } from "./types";
import { recordControlSignal } from "./signal";

async function withExecutor<T>(
  executor: DurabilityExecutor | undefined,
  callback: (value: DurabilityExecutor) => Promise<T>,
): Promise<T> {
  if (executor) {
    if (!isTransactionalExecutor(executor)) {
      throw new TransactionalExecutorRequiredError("work control");
    }
    return callback(executor);
  }
  return getDurabilityClient().transaction(callback);
}

export async function writeControl(
  options: ChangeWorkControlOptions,
  paused: boolean,
): Promise<void> {
  await withExecutor(options.executor, async (executor) => {
    await executor.query(
      `INSERT INTO "_damat_work_controls"
        ("work_kind", "scope", "paused", "reason", "actor")
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT ("work_kind", "scope") DO UPDATE SET
         "paused" = EXCLUDED."paused",
         "reason" = EXCLUDED."reason",
         "actor" = EXCLUDED."actor",
         "updated_at" = NOW()`,
      [
        options.kind,
        options.scope,
        paused,
        options.reason ?? null,
        JSON.stringify(options.actor),
      ],
    );
    await executor.query(
      `INSERT INTO "_damat_work_control_activity"
        ("work_kind", "scope", "action", "reason", "actor")
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        options.kind,
        options.scope,
        paused ? "paused" : "resumed",
        options.reason ?? null,
        JSON.stringify(options.actor),
      ],
    );
    await recordControlSignal(
      executor,
      options.kind,
      options.scope,
    );
  });
}
