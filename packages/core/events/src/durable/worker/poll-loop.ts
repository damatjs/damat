import { getLogger } from "@damatjs/logger";
import { claimEventDeliveries } from "./claim";
import type { ClaimedEventDelivery } from "./types";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export class EventDeliveryPollLoop {
  private enabled = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<ClaimedEventDelivery[]> | undefined;
  private wakeRequested = false;

  constructor(
    private readonly id: string,
    private readonly options: ResolvedEventWorkerOptions,
    private readonly activeCount: () => number,
    private readonly startClaim: (claim: ClaimedEventDelivery) => void,
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

  wake(): void {
    if (!this.enabled) return;
    if (this.inFlight) return void (this.wakeRequested = true);
    if (this.timer) clearTimeout(this.timer);
    void this.run();
  }

  private async run(): Promise<void> {
    if (!this.enabled) return;
    const capacity = this.options.concurrency - this.activeCount();
    let delay = this.options.pollIntervalMs;
    try {
      const poll = () =>
        capacity > 0
          ? claimEventDeliveries({
              consumers: this.options.consumers,
              workerId: this.id,
              limit: capacity,
              leaseMs: this.options.leaseMs,
            })
          : Promise.resolve([]);
      this.inFlight = this.options.coordinator
        ? this.options.coordinator.run(`events:poll:${this.id}`, poll)
        : poll();
      const claims = await this.inFlight;
      if (this.enabled) for (const claim of claims) this.startClaim(claim);
      if (claims.length === capacity && capacity > 0) delay = 0;
    } catch (error) {
      delay = this.options.retryIntervalMs;
      getLogger().error("Event delivery worker poll failed", error);
    } finally {
      this.inFlight = undefined;
      if (this.wakeRequested) {
        this.wakeRequested = false;
        delay = 0;
      }
      const resolved =
        delay === this.options.pollIntervalMs && this.options.coordinator
          ? this.options.coordinator.pollInterval(delay)
          : delay;
      if (this.enabled)
        this.timer = setTimeout(() => void this.run(), resolved);
    }
  }
}
