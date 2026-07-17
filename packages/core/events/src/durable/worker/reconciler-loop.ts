import { getLogger } from "@damatjs/logger";
import { reconcileEventWork } from "./reconciler";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export class EventWorkerReconcilerLoop {
  private enabled = false;
  private lastRetentionAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly id: string,
    private readonly options: ResolvedEventWorkerOptions,
  ) {}

  start(): void {
    this.enabled = true;
    void this.run();
  }

  async stop(): Promise<void> {
    this.enabled = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.inFlight) {
      try {
        await this.inFlight;
      } catch {}
    }
  }

  private async run(): Promise<void> {
    if (!this.enabled) return;
    const now = Date.now();
    const includeRetention =
      now - this.lastRetentionAt >= this.options.retentionIntervalMs;
    try {
      this.inFlight = reconcileEventWork(
        this.id,
        this.options,
        includeRetention,
      );
      await this.inFlight;
      if (includeRetention) this.lastRetentionAt = now;
    } catch (error) {
      getLogger().error("Event worker reconciliation failed", error);
    } finally {
      this.inFlight = undefined;
      if (this.enabled)
        this.timer = setTimeout(
          () => void this.run(),
          this.options.reconcileIntervalMs,
        );
    }
  }
}
