import {
  findJobRuns,
  type JobRun,
  type ListJobRunsOptions,
} from "../repositories";

export function listJobRuns(
  options: ListJobRunsOptions = {},
): Promise<JobRun[]> {
  return findJobRuns(options);
}
