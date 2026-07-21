import { heartbeatWorker } from "@damatjs/durability";
import { getLogger } from "@damatjs/logger";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export class EventWorkerRegistryLoop {
  private enabled = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly id: string,
    private readonly options: ResolvedEventWorkerOptions,
    private readonly activeCount: () => number,
  ) {}

  start(): void {
    this.enabled = true;
    this.schedule(this.options.registryHeartbeatIntervalMs);
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

  private schedule(delay: number): void {
    if (this.enabled) this.timer = setTimeout(() => void this.run(), delay);
  }

  private async run(): Promise<void> {
    if (!this.enabled) return;
    let delay = this.options.registryHeartbeatIntervalMs;
    try {
      const heartbeat = () =>
        heartbeatWorker({ id: this.id, inFlight: this.activeCount() });
      this.inFlight = this.options.coordinator
        ? this.options.coordinator.run(`events:registry:${this.id}`, heartbeat)
        : heartbeat();
      await this.inFlight;
    } catch (error) {
      delay = this.options.retryIntervalMs;
      getLogger().error("Event worker heartbeat failed", error);
    } finally {
      this.inFlight = undefined;
      this.schedule(delay);
    }
  }
}
