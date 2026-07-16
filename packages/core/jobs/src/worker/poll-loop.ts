import { getLogger } from "@damatjs/logger";
import type { WorkerDependencies } from "./dependencies";
import type { ResolvedWorkerOptions } from "./options";
import type { ClaimedJobRun } from "./types";

export class WorkerPollLoop {
  private enabled = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<ClaimedJobRun[]> | undefined;

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

  private async run(): Promise<void> {
    if (!this.enabled) return;
    const active = this.activeCount();
    const capacity = this.options.concurrency - active;
    try {
      this.inFlight = this.dependencies.poll(this.options, this.id, active);
      const claims = await this.inFlight;
      if (!this.enabled) return;
      for (const claim of claims) this.startClaim(claim);
      this.schedule(claims.length === capacity && capacity > 0 ? 0 : undefined);
    } catch (error) {
      getLogger().error("Job worker poll failed", error);
      this.schedule(this.options.retryIntervalMs);
    } finally {
      this.inFlight = undefined;
    }
  }

  private schedule(delay = this.options.pollIntervalMs): void {
    if (!this.enabled) return;
    this.timer = setTimeout(() => void this.run(), delay);
  }
}
