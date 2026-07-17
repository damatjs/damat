import {
  listWorkers,
  redactValue,
  validateWorkSummaryFilter,
  type WorkSummaryFilter,
} from "@damatjs/durability";
import type { ResolvedEventInspectionOptions } from "./options";
import { queryEventCurrentSummary } from "./summary-current";
import {
  queryEventActivityCounts,
  queryEventDeadLetters,
  queryEventDurations,
} from "./summary-history";
import { queryEventThroughput } from "./summary-throughput";
import { queryEventWaitingDurations } from "./summary-waiting";
import type { EventOperationalSummary } from "./summary-types";

export async function getEventOperationalSummary(
  filter: WorkSummaryFilter,
  options: ResolvedEventInspectionOptions,
): Promise<EventOperationalSummary> {
  validateWorkSummaryFilter(filter);
  const now = filter.now ?? new Date();
  return options.client.transaction(async (executor) => {
    await executor.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const current = await queryEventCurrentSummary(executor, now);
    const activityCounts = await queryEventActivityCounts(executor, filter);
    const durationMs = await queryEventDurations(executor, filter);
    const waitingMs = await queryEventWaitingDurations(executor, filter);
    const throughput = await queryEventThroughput(executor, filter);
    const deadLetters = await queryEventDeadLetters(executor, filter);
    const all = await listWorkers({
      now,
      staleAfterMs: filter.staleAfterMs ?? options.staleAfterMs,
      executor,
    });
    const records = all
      .filter(
        ({ capabilities, state }) =>
          (state === "active" || state === "stale") &&
          capabilities.some((item) => item.startsWith("events:")),
      )
      .map(({ application, deployment, ...worker }) => ({
        ...worker,
        ...(options.visibility !== "hidden"
          ? {
              application: redactValue(
                application,
                options.redaction,
              ) as Record<string, unknown>,
              deployment: redactValue(deployment, options.redaction) as Record<
                string,
                unknown
              >,
            }
          : {}),
      }));
    const active = records.filter(({ state }) => state === "active");
    const concurrency = active.reduce(
      (total, row) => total + row.concurrency,
      0,
    );
    const inFlight = active.reduce((total, row) => total + row.inFlight, 0);
    return {
      range: filter,
      ...current,
      activityCounts,
      throughput,
      durationMs,
      waitingMs,
      workers: {
        records,
        concurrency,
        inFlight,
        available: Math.max(0, concurrency - inFlight),
      },
      deadLetters,
    };
  });
}
