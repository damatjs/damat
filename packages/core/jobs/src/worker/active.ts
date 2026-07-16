import { getLogger } from "@damatjs/logger";
import type { JobExecution } from "./execute";
import { waitForJobDrain } from "./stop";

export class ActiveExecutions {
  private readonly executions = new Set<JobExecution>();

  constructor(private readonly onEmpty: () => void) {}

  get size(): number {
    return this.executions.size;
  }

  track(execution: JobExecution): void {
    this.executions.add(execution);
    void execution.promise
      .catch((error) => getLogger().error("Job execution failed", error))
      .finally(() => {
        this.executions.delete(execution);
        if (!this.executions.size) this.onEmpty();
      });
  }

  async drain(graceMs: number): Promise<boolean> {
    return waitForJobDrain(
      new Set([...this.executions].map(({ promise }) => promise)),
      graceMs,
    );
  }

  abort(): void {
    for (const execution of this.executions) execution.abort();
  }
}
