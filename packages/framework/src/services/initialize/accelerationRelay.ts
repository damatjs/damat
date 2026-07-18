import {
  type AccelerationActor,
  type DurabilityCoordinator,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import {
  accelerationRelayOperations,
  type AccelerationRelayOperations,
} from "./accelerationRelayOperations";

export class AccelerationRelay {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;

  constructor(
    private readonly redis: Redis,
    private readonly batchSize: number,
    private readonly intervalMs: number,
    private readonly enabled: { jobs: boolean; events: boolean },
    private readonly coordinator: DurabilityCoordinator,
    private readonly onError: (error: unknown) => void,
    private readonly operations: AccelerationRelayOperations =
      accelerationRelayOperations,
  ) {}

  start(): void {
    this.running = true;
    void this.flush();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  async flush(): Promise<void> {
    if (!this.running) return;
    await this.coordinator.run("acceleration:relay", () => this.flushOnce());
  }

  private async flushOnce(): Promise<void> {
    try {
      const signals = await this.operations.claim(this.batchSize);
      let checkpoint: string | undefined;
      for (const signal of signals) {
        try {
          await this.operations.publish(this.redis, signal);
          await this.operations.markPublished(signal);
          checkpoint = signal.revision;
        } catch (error) {
          await this.operations.release(signal, error);
          throw error;
        }
      }
      await this.operations.updateState({
        mode: "healthy",
        fallbackPollIntervalMs: 5_000,
        ...(checkpoint ? { checkpoint } : {}),
        published: Boolean(checkpoint),
      });
    } catch (error) {
      this.onError(error);
    } finally {
      if (this.running) {
        this.timer = setTimeout(() => void this.flush(), this.intervalMs);
      }
    }
  }

  async rebuild(actor: AccelerationActor): Promise<void> {
    await this.coordinator.run("acceleration:rebuild", () =>
      this.rebuildOnce(actor),
    );
  }

  private async rebuildOnce(actor: AccelerationActor): Promise<void> {
    await this.operations.audit(actor, "requested");
    try {
      await this.operations.rebuild(this.redis, this.enabled);
      await this.operations.updateState({
        mode: "healthy",
        fallbackPollIntervalMs: 5_000,
        rebuilt: true,
      });
      await this.operations.audit(actor, "completed");
    } catch (error) {
      await this.operations.audit(actor, "failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
