import { claimJobRuns } from "./claim";
import type { ClaimedJobRun, JobWorkerOptions } from "./types";

export function pollJobClaims(
  options: Required<
    Pick<JobWorkerOptions, "queue" | "concurrency" | "leaseMs">
  > &
    JobWorkerOptions,
  workerId: string,
  activeCount: number,
): Promise<ClaimedJobRun[]> {
  const capacity = options.concurrency - activeCount;
  if (capacity <= 0) return Promise.resolve([]);
  return claimJobRuns({
    queue: options.queue,
    workerId,
    limit: capacity,
    leaseMs: options.leaseMs,
  });
}
