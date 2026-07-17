import { decodeCursor } from "@damatjs/durability";
import type { JobRunStatus } from "../../repositories";
import type { ResolvedInspectionOptions } from "../config";
import type { JobRunFilter, JobRunView } from "../types";

const viewStatuses: Record<JobRunView, JobRunStatus[]> = {
  upcoming: ["queued"],
  processing: ["running"],
  retrying: ["retry_wait"],
  failed: ["dead_lettered"],
  completed: ["succeeded", "cancelled"],
};

function values<T>(input: T[] | undefined): T[] | null {
  return input?.length ? input : null;
}

export function resolveListRequest(
  filter: JobRunFilter,
  options: ResolvedInspectionOptions,
) {
  const limit = filter.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("job inspection limit must be between 1 and 500");
  }
  const cursor = filter.cursor
    ? decodeCursor(filter.cursor, options.cursorSigningKey)
    : undefined;
  const views = filter.views?.flatMap((view) => viewStatuses[view]);
  return {
    limit,
    params: [
      values(filter.statuses),
      values(views),
      filter.recovered ?? null,
      values(filter.queues),
      values(filter.names),
      values(filter.workerIds),
      filter.leaseState ?? null,
      filter.available?.from ?? null,
      filter.available?.to ?? null,
      filter.created?.from ?? null,
      filter.created?.to ?? null,
      filter.started?.from ?? null,
      filter.started?.to ?? null,
      filter.finished?.from ?? null,
      filter.finished?.to ?? null,
      filter.failed?.from ?? null,
      filter.failed?.to ?? null,
      values(filter.correlationIds),
      values(filter.scheduleIds),
      values(filter.deduplicationKeys),
      cursor?.sortTimestamp ?? null,
      cursor?.id ?? null,
      limit + 1,
    ],
  };
}
