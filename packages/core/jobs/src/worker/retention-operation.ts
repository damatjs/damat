import type { DurabilityClient } from "@damatjs/durability";
import { recordJobRetention } from "./retention-audit";
import {
  deleteExpiredDeduplication,
  deleteTerminalJobRuns,
} from "./retention-delete";
import type { JobRetentionOptions, JobRetentionResult } from "./retention";

export function retentionDetails(
  options: JobRetentionOptions,
  batchSize: number,
): Record<string, unknown> {
  return {
    batchSize,
    terminalBefore: options.terminalBefore?.toISOString() ?? null,
    deduplicationBefore: options.deduplicationBefore?.toISOString() ?? null,
    queue: options.queue ?? null,
  };
}

export function performJobRetention(
  client: DurabilityClient,
  options: JobRetentionOptions,
  limit: number,
  details: Record<string, unknown>,
): Promise<JobRetentionResult> {
  return client.transaction(async (executor) => {
    const result = {
      deletedDeduplication: await deleteExpiredDeduplication(
        executor,
        options.deduplicationBefore ?? new Date(),
        limit,
        options.queue,
      ),
      deletedRuns: options.terminalBefore
        ? await deleteTerminalJobRuns(
            executor,
            options.terminalBefore,
            limit,
            options.queue,
          )
        : 0,
    };
    await recordJobRetention(
      executor,
      options.actor,
      "completed",
      { ...details, ...result },
      options.queue,
    );
    return result;
  });
}
