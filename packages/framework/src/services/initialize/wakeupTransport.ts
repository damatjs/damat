import type { DurabilityCoordinator } from "@damatjs/durability";
import type { ILogger } from "@damatjs/logger";
import type { Redis } from "@damatjs/redis";
import { warnAccelerationUnavailable } from "./accelerationWarning";
import { probeAccelerationPublish } from "./accelerationProbe";
import type { WakeupTargets } from "./wakeupTargets";
import { wakeupRetryDelay } from "./wakeupLiveness";
import { createWakeupLifecycle, type WakeupLifecycle } from "./wakeupLifecycle";
export class WorkerWakeupTransport {
  private retry: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private warned = false;
  private degradation: Promise<void> | null = null;
  private attempts = 0;
  private readonly lifecycle: WakeupLifecycle;
  constructor(
    private readonly redis: Redis,
    private readonly coordinator: DurabilityCoordinator,
    targets: WakeupTargets,
    private readonly logger: ILogger,
    livenessTtlMs = 10_000,
    private readonly onHealthy?: () => Promise<void>,
    private readonly onDegraded?: () => void,
    private readonly redisUser = "default",
  ) {
    this.lifecycle = createWakeupLifecycle(
      redis,
      coordinator,
      targets,
      livenessTtlMs,
      (error) => this.markDegraded(error),
    );
  }

  start(): void {
    void this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    if (this.degradation) await this.degradation;
    await this.lifecycle.stop();
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      await this.lifecycle.subscriber.connect();
      await probeAccelerationPublish(this.redis);
      await this.onHealthy?.();
      this.attempts = 0;
      this.lifecycle.markHealthy();
      if (this.warned)
        this.logger.info("Durability Redis acceleration recovered");
      this.warned = false;
    } catch (error) {
      await this.markDegraded(error);
    }
  }

  async markDegraded(error: unknown): Promise<void> {
    if (this.stopped) return;
    if (this.degradation) return this.degradation;
    this.degradation = this.degrade(error);
    try {
      await this.degradation;
    } finally {
      this.degradation = null;
    }
  }

  private async degrade(error: unknown): Promise<void> {
    await this.lifecycle.markDegraded(this.onDegraded);
    if (this.stopped) return;
    const fallback = this.coordinator.pollInterval(5_000);
    if (!this.warned)
      warnAccelerationUnavailable(this.logger, error, fallback, this.redisUser);
    this.warned = true;
    this.retry = setTimeout(() => {
      this.retry = undefined;
      void this.connect();
    }, wakeupRetryDelay(this.attempts++));
  }
}
