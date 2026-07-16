import type { ActiveExecutions } from "./active";
import type { WorkerDependencies } from "./dependencies";

export class WorkerShutdown {
  private waitingForDrain = false;
  private stopped = false;

  constructor(
    private readonly id: string,
    private readonly dependencies: WorkerDependencies,
    private readonly active: () => ActiveExecutions,
  ) {}

  async begin(graceMs: number): Promise<void> {
    await this.dependencies.markStopping(this.id).catch(() => {});
    if (await this.active().drain(graceMs)) return this.finish();
    this.waitingForDrain = true;
    this.active().abort();
    if (!this.active().size) await this.finish();
  }

  async onEmpty(): Promise<void> {
    if (this.waitingForDrain) await this.finish();
  }

  private async finish(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.dependencies.stop(this.id).catch(() => {});
  }
}
