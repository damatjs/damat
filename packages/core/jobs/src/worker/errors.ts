export class JobLeaseLostError extends Error {
  constructor(runId: string) {
    super(`Job lease is no longer current for run ${runId}`);
    this.name = "JobLeaseLostError";
  }
}
