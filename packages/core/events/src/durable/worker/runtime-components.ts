import { ActiveEventDeliveries } from "./active";
import { startEventDeliveryExecution } from "./execution";
import { EventDeliveryPollLoop } from "./poll-loop";
import { EventWorkerReconcilerLoop } from "./reconciler-loop";
import { EventWorkerRegistryLoop } from "./registry-loop";
import type { ResolvedEventWorkerOptions } from "./runtime-options";
import type { ClaimedEventDelivery } from "./types";
import { EventWorkerWakeupLifecycle } from "./wakeup-lifecycle";
import { EventLeaseHeartbeatLoop } from "./heartbeat-loop";

export class EventWorkerRuntimeComponents {
  readonly active: ActiveEventDeliveries;
  private readonly poll: EventDeliveryPollLoop;
  private readonly registry: EventWorkerRegistryLoop;
  private readonly reconciler: EventWorkerReconcilerLoop;
  private readonly wakeup: EventWorkerWakeupLifecycle;
  private readonly leaseHeartbeat: EventLeaseHeartbeatLoop;

  constructor(
    id: string,
    private readonly options: ResolvedEventWorkerOptions,
    onEmpty: () => void,
    private readonly canStartClaim: () => boolean,
  ) {
    this.active = new ActiveEventDeliveries(onEmpty);
    const count = () => this.active.size;
    this.poll = new EventDeliveryPollLoop(id, options, count, (claim) =>
      this.startClaim(claim),
    );
    this.registry = new EventWorkerRegistryLoop(id, options, count);
    this.reconciler = new EventWorkerReconcilerLoop(id, options);
    this.wakeup = new EventWorkerWakeupLifecycle(options, () =>
      this.poll.wake(),
    );
    this.leaseHeartbeat = new EventLeaseHeartbeatLoop(options, this.active);
  }

  start(): void {
    this.poll.start();
    this.registry.start();
    this.reconciler.start();
    this.wakeup.start();
    this.leaseHeartbeat.start();
  }

  stopClaims(): Promise<unknown[]> {
    return Promise.all([this.wakeup.stop(), this.poll.stop()]);
  }

  stopMaintenance(): Promise<unknown[]> {
    return Promise.all([
      this.registry.stop(),
      this.reconciler.stop(),
      this.leaseHeartbeat.stop(),
    ]);
  }

  wake(): void {
    this.poll.wake();
  }

  private startClaim(claim: ClaimedEventDelivery): void {
    if (!this.canStartClaim()) return;
    this.active.track(startEventDeliveryExecution(claim, this.options));
  }
}
