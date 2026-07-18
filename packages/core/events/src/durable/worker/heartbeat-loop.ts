import { getDurabilityClient } from "@damatjs/durability";
import { getLogger } from "@damatjs/logger";
import type { ActiveEventDeliveries } from "./active";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export class EventLeaseHeartbeatLoop {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly options: ResolvedEventWorkerOptions,
    private readonly active: ActiveEventDeliveries,
  ) {}

  start(): void {
    if (!this.options.batchHeartbeats) return;
    this.running = true;
    this.schedule();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    try {
      await this.inFlight;
    } catch {
      // The batch loop owns and logs heartbeat failures.
    }
  }

  private schedule(): void {
    if (this.running) {
      this.timer = setTimeout(
        () => void this.run(),
        this.options.heartbeatIntervalMs,
      );
    }
  }

  private async run(): Promise<void> {
    const executions = this.active.values();
    if (!executions.length) return this.schedule();
    try {
      this.inFlight = getDurabilityClient().transaction(async (executor) => {
        for (const execution of executions) {
          await execution.heartbeat(executor).catch(() => execution.abort());
        }
      });
      await this.inFlight;
    } catch (error) {
      getLogger().error("Event lease heartbeat batch failed", error);
    } finally {
      this.inFlight = undefined;
      this.schedule();
    }
  }
}
