import { getLogger } from "@damatjs/logger";
import type { WorkerDependencies } from "./dependencies";
import type { ResolvedWorkerOptions } from "./options";
import type { ClaimedJobRun } from "./types";

export class WorkerPollLoop {
  private enabled = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<ClaimedJobRun[]> | undefined;
  private wakeRequested = false;

  constructor(
    private readonly id: string,
    private readonly options: ResolvedWorkerOptions,
    private readonly dependencies: WorkerDependencies,
    private readonly activeCount: () => number,
    private readonly startClaim: (claim: ClaimedJobRun) => void,
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

  wake(): void {
    if (!this.enabled) return;
    if (this.inFlight) {
      this.wakeRequested = true;
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    void this.run();
  }

  private async run(): Promise<void> {
    if (!this.enabled) return;
    const active = this.activeCount();
    const capacity = this.options.concurrency - active;
    try {
      const poll = () => this.dependencies.poll(this.options, this.id, active);
      this.inFlight = this.options.coordinator
        ? this.options.coordinator.run(`jobs:poll:${this.id}`, poll)
        : poll();
      const claims = await this.inFlight;
      if (!this.enabled) return;
      for (const claim of claims) this.startClaim(claim);
      this.schedule(claims.length === capacity && capacity > 0 ? 0 : undefined);
    } catch (error) {
      getLogger().error("Job worker poll failed", error);
      this.schedule(this.options.retryIntervalMs);
    } finally {
      this.inFlight = undefined;
      if (this.wakeRequested) {
        this.wakeRequested = false;
        if (this.timer) clearTimeout(this.timer);
        this.schedule(0);
      }
    }
  }

  private schedule(delay?: number): void {
    if (!this.enabled) return;
    const fallback = delay ?? this.options.pollIntervalMs;
    const resolved =
      delay === undefined && this.options.coordinator
        ? this.options.coordinator.pollInterval(fallback)
        : fallback;
    this.timer = setTimeout(() => void this.run(), resolved);
  }
}
