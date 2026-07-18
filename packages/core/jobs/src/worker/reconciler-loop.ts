import { getLogger } from "@damatjs/logger";
import type { WorkerDependencies } from "./dependencies";
import type { ResolvedWorkerOptions } from "./options";

export class JobReconcilerLoop {
  private enabled = false;
  private lastRetentionAt = Date.now();
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly workerId: string,
    private readonly options: ResolvedWorkerOptions,
    private readonly dependencies: WorkerDependencies,
  ) {}

  start(): void {
    this.enabled = true;
    void this.run();
  }

  async stop(): Promise<void> {
    this.enabled = false;
    if (this.timer) clearTimeout(this.timer);
    await this.inFlight?.catch(() => {});
  }

  private async run(): Promise<void> {
    if (!this.enabled) return;
    const now = Date.now();
    const includeRetention =
      now - this.lastRetentionAt >= this.options.retentionIntervalMs;
    try {
      const reconcile = () =>
        this.dependencies.reconcile({
          workerId: this.workerId,
          queue: this.options.queue,
          batchSize: this.options.reconcileBatchSize,
          retentionMs: this.options.retentionMs,
          includeRetention,
        });
      this.inFlight = this.options.coordinator
        ? this.options.coordinator.run(`jobs:reconcile:${this.workerId}`, reconcile)
        : reconcile();
      await this.inFlight;
      if (includeRetention) this.lastRetentionAt = now;
    } catch (error) {
      getLogger().error("Job reconciliation failed", error);
    } finally {
      this.inFlight = undefined;
      if (this.enabled) {
        const delay = this.options.coordinator?.pollInterval(
          this.options.reconcileIntervalMs,
        );
        this.timer = setTimeout(() => void this.run(), delay);
      }
    }
  }
}
