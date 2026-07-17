import { redactValue, validateWorkSummaryFilter } from "@damatjs/durability";
import type { ResolvedInspectionOptions } from "./config";
import { readActivityCounts, readStatusCounts } from "./summary/counts";
import { readDistribution } from "./summary/distribution";
import { readThroughput } from "./summary/throughput";
import { readFailureGroups, readWorkState } from "./summary/work";
import { readJobWorkerSummary } from "./summary/workers";
import type { JobOperationalSummary, JobSummaryFilter } from "./types";

export async function getJobOperationalSummary(
  filter: JobSummaryFilter,
  options: ResolvedInspectionOptions,
): Promise<JobOperationalSummary> {
  validateWorkSummaryFilter(filter);
  const now = filter.now ?? new Date();
  const staleAfterMs = filter.staleAfterMs ?? options.staleAfterMs;
  return options.client.transaction(async (executor) => {
    await executor.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const statusCounts = await readStatusCounts(executor);
    const activityCounts = await readActivityCounts(
      executor,
      filter.from,
      filter.to,
    );
    const throughput = await readThroughput(
      executor,
      filter.from,
      filter.to,
      filter.intervalMs,
    );
    const processingDuration = await readDistribution(
      executor,
      "processing",
      filter.from,
      filter.to,
    );
    const waitingDuration = await readDistribution(
      executor,
      "waiting",
      filter.from,
      filter.to,
    );
    const work = await readWorkState(executor, now);
    const groups = (
      await readFailureGroups(executor, filter.from, filter.to)
    ).map((group) => ({
      ...group,
      message: (
        redactValue({ message: group.message }, options.redaction) as {
          message: string;
        }
      ).message,
    }));
    const workers = await readJobWorkerSummary(
      executor,
      now,
      staleAfterMs,
      options,
    );
    const { deadLetterTotal, ...current } = work;
    return {
      statusCounts,
      activityCounts,
      throughput,
      processingDuration,
      waitingDuration,
      ...current,
      workers,
      deadLetters: { total: deadLetterTotal, groups },
    };
  });
}
