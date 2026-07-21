import type { DurabilityCoordinator } from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";
import { persistAccelerationMode } from "./accelerationState";
import { createWakeupLiveness } from "./wakeupLiveness";
import { WakeupPublisherGate } from "./wakeupPublisherGate";
import { WorkerWakeupSubscriber } from "./wakeupSubscriber";
import type { WakeupTargets } from "./wakeupTargets";

export function createWakeupLifecycle(
  redis: Redis,
  coordinator: DurabilityCoordinator,
  targets: WakeupTargets,
  ttlMs: number,
  onError: (error: unknown) => Promise<void>,
): WakeupLifecycle {
  return new WakeupLifecycle(
    coordinator,
    new WorkerWakeupSubscriber(redis, targets, onError),
    new WakeupPublisherGate(redis, onError),
    createWakeupLiveness(redis, targets, ttlMs, onError),
  );
}

export class WakeupLifecycle {
  constructor(
    private readonly coordinator: DurabilityCoordinator,
    readonly subscriber: WorkerWakeupSubscriber,
    private readonly publishers: WakeupPublisherGate,
    private readonly liveness: ReturnType<typeof createWakeupLiveness>,
  ) {}

  markHealthy(): void {
    this.coordinator.setMode("healthy");
    this.publishers.enable();
    this.liveness.start();
  }

  async markDegraded(onDegraded?: () => void): Promise<void> {
    this.coordinator.setMode("degraded");
    onDegraded?.();
    this.publishers.disable();
    await this.liveness.stop();
    await this.subscriber.close();
    await persistAccelerationMode(this.coordinator, "degraded");
  }

  async stop(): Promise<void> {
    this.publishers.disable();
    await this.liveness.stop();
    await this.subscriber.close();
    this.coordinator.setMode("disabled");
    await persistAccelerationMode(this.coordinator, "disabled");
  }
}
