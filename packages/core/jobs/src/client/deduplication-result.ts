import type { JobRun } from "../repositories";

export function requireDeduplicatedRun(
  run: JobRun | undefined,
  runId: string,
): JobRun {
  if (!run) {
    throw new Error(`Deduplicated job run ${runId} was not found`);
  }
  return run;
}
