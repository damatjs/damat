import type { DurabilityCoordinator } from "@damatjs/durability";
import type { ILogger } from "@damatjs/logger";
import type { Redis } from "@damatjs/redis";
import { WorkerLiveness, type LivenessWorker } from "./workerLiveness";
import { WorkerWakeupSubscriber } from "./wakeupSubscriber";
import { WakeupPublisherGate } from "./wakeupPublisherGate";
import { warnAccelerationUnavailable } from "./accelerationWarning";
import { persistAccelerationMode } from "./accelerationState";
import { probeAccelerationPublish } from "./accelerationProbe";
import type { WakeupTargets } from "./wakeupTargets";
export class WorkerWakeupTransport {
  private retry: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private warned = false;
  private degrading = false;
  private attempts = 0;
  private readonly liveness: WorkerLiveness;
  private readonly subscriber: WorkerWakeupSubscriber;
  private readonly publishers: WakeupPublisherGate;

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
    const workers = [targets.job, targets.event].filter(Boolean) as LivenessWorker[];
    this.liveness = new WorkerLiveness(
      redis,
      workers,
      livenessTtlMs,
      (error) => void this.markDegraded(error),
    );
    this.subscriber = new WorkerWakeupSubscriber(redis, targets);
    this.publishers = new WakeupPublisherGate(redis, (error) =>
      this.markDegraded(error),
    );
  }

  start(): void {
    void this.connect();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.publishers.disable();
    await this.liveness.stop();
    await this.subscriber.close();
    this.coordinator.setMode("disabled");
    await persistAccelerationMode(this.coordinator, "disabled");
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      await this.subscriber.connect();
      await probeAccelerationPublish(this.redis);
      await this.onHealthy?.();
      this.attempts = 0;
      this.coordinator.setMode("healthy");
      this.publishers.enable();
      this.liveness.start();
      if (this.warned) this.logger.info("Durability Redis acceleration recovered");
      this.warned = false;
    } catch (error) {
      await this.markDegraded(error);
    }
  }

  async markDegraded(error: unknown): Promise<void> {
    if (this.stopped || this.degrading) return;
    this.degrading = true;
    try {
      this.coordinator.setMode("degraded");
      this.onDegraded?.();
      this.publishers.disable();
      await this.liveness.stop();
      await this.subscriber.close();
      await persistAccelerationMode(this.coordinator, "degraded");
      const fallback = this.coordinator.pollInterval(5_000);
      if (!this.warned) warnAccelerationUnavailable(this.logger, error, fallback, this.redisUser);
      this.warned = true;
      this.retry = setTimeout(() => {
        this.retry = undefined;
        void this.connect();
      }, this.retryDelay());
    } finally {
      this.degrading = false;
    }
  }

  private retryDelay(): number {
    return Math.min(30_000, 1_000 * 2 ** this.attempts++);
  }
}
