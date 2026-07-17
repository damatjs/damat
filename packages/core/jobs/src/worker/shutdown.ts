import type { ActiveExecutions } from "./active";
import type { WorkerDependencies } from "./dependencies";

export class WorkerShutdown {
  private waitingForDrain = false;
  private stopped = false;
  private finishTask: Promise<void> | undefined;

  constructor(
    private readonly id: string,
    private readonly dependencies: WorkerDependencies,
    private readonly active: () => ActiveExecutions,
  ) {}

  get isStopped(): boolean {
    return this.stopped;
  }

  get isWaitingForDrain(): boolean {
    return this.waitingForDrain;
  }

  async begin(graceMs: number): Promise<boolean> {
    await this.dependencies.markStopping(this.id);
    if (await this.active().drain(graceMs)) return true;
    this.waitingForDrain = true;
    this.active().abort();
    return !this.active().size;
  }

  async onEmpty(): Promise<void> {
    if (this.waitingForDrain) await this.finish();
  }

  complete(): Promise<void> {
    return this.finish();
  }

  private finish(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.finishTask) return this.finishTask;
    const task = this.persistStopped();
    this.finishTask = task;
    void task.catch(() => (this.finishTask = undefined));
    return task;
  }

  private async persistStopped(): Promise<void> {
    await this.dependencies.stop(this.id);
    this.stopped = true;
    this.waitingForDrain = false;
  }
}
