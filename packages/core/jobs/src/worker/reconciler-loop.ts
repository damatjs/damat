import { getLogger } from "@damatjs/logger";
import type { WorkerDependencies } from "./dependencies";
import type { ResolvedWorkerOptions } from "./options";

export class JobReconcilerLoop {
  private enabled = false;
  private lastRetentionAt = 0;
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
      this.inFlight = this.dependencies.reconcile({
        workerId: this.workerId,
        queue: this.options.queue,
        batchSize: this.options.reconcileBatchSize,
        retentionMs: this.options.retentionMs,
        includeRetention,
      });
      await this.inFlight;
      if (includeRetention) this.lastRetentionAt = now;
    } catch (error) {
      getLogger().error("Job reconciliation failed", error);
    } finally {
      this.inFlight = undefined;
      if (this.enabled) {
        this.timer = setTimeout(
          () => void this.run(),
          this.options.reconcileIntervalMs,
        );
      }
    }
  }
}
