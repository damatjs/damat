import { resolveInspectionOptions } from "./config";
import {
  cancelInspectedJob,
  retryInspectedJob,
  runInspectedJobRetention,
  setQueuePaused,
  setScheduleEnabled,
} from "./admin";
import { getInspectedJobRun } from "./detail";
import { listInspectedJobRuns } from "./list";
import { getJobOperationalSummary } from "./summary";
import type { JobInspectionClient, JobInspectionOptions } from "./types";

export function createJobInspectionClient(
  input: JobInspectionOptions,
): JobInspectionClient {
  const options = resolveInspectionOptions(input);
  return {
    listRuns: (filter = {}) => listInspectedJobRuns(filter, options),
    getRun: (id) => getInspectedJobRun(id, options),
    getSummary: (filter) => getJobOperationalSummary(filter, options),
    cancel: (id, actor, reason) =>
      cancelInspectedJob(id, actor, reason, options),
    retry: (id, actor) => retryInspectedJob(id, actor, options),
    pauseQueue: (queue, actor, reason) =>
      setQueuePaused(queue, true, actor, reason, options),
    resumeQueue: (queue, actor) =>
      setQueuePaused(queue, false, actor, undefined, options),
    enableSchedule: (id, actor) =>
      setScheduleEnabled(id, true, actor, undefined, options),
    disableSchedule: (id, actor, reason) =>
      setScheduleEnabled(id, false, actor, reason, options),
    runRetention: (request, actor) =>
      runInspectedJobRetention(request, actor, options),
  };
}

export * from "./admin/errors";
export * from "./types";
