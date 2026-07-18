import {
  type AccelerationActor,
  type DurabilityCoordinator,
} from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import {
  accelerationRelayOperations,
  type AccelerationRelayOperations,
} from "./accelerationRelayOperations";
import { rebuildAccelerationRelay } from "./accelerationRelayRebuild";
import { flushAccelerationRelay } from "./accelerationRelayFlush";

export class AccelerationRelay {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private inFlight: Promise<void> | null = null;
  private requested = false;

  constructor(
    private readonly redis: Redis,
    private readonly batchSize: number,
    private readonly intervalMs: number,
    private readonly enabled: {
      jobs: boolean;
      events: boolean;
      pipelines?: boolean;
    },
    private readonly coordinator: DurabilityCoordinator,
    private readonly onError: (error: unknown) => void,
    private readonly operations: AccelerationRelayOperations = accelerationRelayOperations,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.flush();
  }

  stop(): void {
    this.running = false;
    this.requested = false;
    if (this.timer) clearTimeout(this.timer);
  }

  async flush(): Promise<void> {
    if (!this.running) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.inFlight) {
      this.requested = true;
      await this.inFlight;
      return;
    }
    this.inFlight = this.coordinator.run("acceleration:relay", () =>
      this.flushOnce(),
    );
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
      if (this.running) this.schedule(this.requested ? 0 : this.intervalMs);
      this.requested = false;
    }
  }

  private async flushOnce(): Promise<void> {
    await flushAccelerationRelay(
      this.operations,
      this.redis,
      this.batchSize,
      this.onError,
    );
  }

  async rebuild(actor: AccelerationActor): Promise<void> {
    await rebuildAccelerationRelay(
      this.operations,
      this.redis,
      this.enabled,
      this.coordinator,
      actor,
    );
  }

  private schedule(delay: number): void {
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
  }
}
