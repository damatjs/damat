import { getLogger } from "@damatjs/logger";
import type { WorkerDependencies } from "./dependencies";
import type { ResolvedWorkerOptions } from "./options";

export class WorkerRegistryHeartbeat {
  private enabled = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly id: string,
    private readonly options: ResolvedWorkerOptions,
    private readonly dependencies: WorkerDependencies,
    private readonly activeCount: () => number,
  ) {}

  start(): void {
    this.enabled = true;
    this.schedule(this.options.registryHeartbeatIntervalMs);
  }

  async stop(): Promise<void> {
    this.enabled = false;
    if (this.timer) clearTimeout(this.timer);
    await this.inFlight?.catch(() => {});
  }

  private schedule(delay: number): void {
    if (!this.enabled) return;
    this.timer = setTimeout(() => void this.run(), delay);
  }

  private async run(): Promise<void> {
    if (!this.enabled) return;
    let delay = this.options.registryHeartbeatIntervalMs;
    try {
      const heartbeat = () =>
        this.dependencies.heartbeat(this.id, this.activeCount());
      this.inFlight = this.options.coordinator
        ? this.options.coordinator.run(`jobs:registry:${this.id}`, heartbeat)
        : heartbeat();
      await this.inFlight;
    } catch (error) {
      delay = this.options.retryIntervalMs;
      getLogger().error("Job worker heartbeat failed", error);
    } finally {
      this.inFlight = undefined;
      this.schedule(delay);
    }
  }
}
