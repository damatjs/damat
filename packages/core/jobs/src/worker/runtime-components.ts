import { ActiveExecutions } from "./active";
import type { WorkerDependencies } from "./dependencies";
import type { ResolvedWorkerOptions } from "./options";
import { WorkerPollLoop } from "./poll-loop";
import { JobReconcilerLoop } from "./reconciler-loop";
import { WorkerRegistryHeartbeat } from "./registry-heartbeat";
import { WorkerShutdown } from "./shutdown";
import type { ClaimedJobRun } from "./types";
import { WorkerWakeupLifecycle } from "./wakeup-lifecycle";

export class WorkerRuntimeComponents {
  readonly active: ActiveExecutions;
  readonly shutdown: WorkerShutdown;
  private readonly poll: WorkerPollLoop;
  private readonly heartbeat: WorkerRegistryHeartbeat;
  private readonly reconciler: JobReconcilerLoop;
  private readonly wakeup: WorkerWakeupLifecycle;

  constructor(
    id: string,
    options: ResolvedWorkerOptions,
    private readonly dependencies: WorkerDependencies,
    onEmpty: () => void,
    private readonly canStartClaim: () => boolean,
  ) {
    this.active = new ActiveExecutions(onEmpty);
    this.shutdown = new WorkerShutdown(id, dependencies, () => this.active);
    const count = () => this.active.size;
    this.poll = new WorkerPollLoop(id, options, dependencies, count, (claim) =>
      this.startClaim(claim, options),
    );
    this.heartbeat = new WorkerRegistryHeartbeat(
      id,
      options,
      dependencies,
      count,
    );
    this.reconciler = new JobReconcilerLoop(id, options, dependencies);
    this.wakeup = new WorkerWakeupLifecycle(
      options.wakeupRedis,
      dependencies,
      (queue) => {
        if (queue === options.queue) this.poll.wake();
      },
    );
  }

  start(): void {
    this.poll.start();
    this.heartbeat.start();
    this.reconciler.start();
    this.wakeup.start();
  }

  stop(): Promise<void[]> {
    return Promise.all([
      this.wakeup.stop(),
      this.poll.stop(),
      this.heartbeat.stop(),
      this.reconciler.stop(),
    ]);
  }

  private startClaim(
    claim: ClaimedJobRun,
    options: ResolvedWorkerOptions,
  ): void {
    if (!this.canStartClaim()) return;
    this.active.track(this.dependencies.startExecution(claim, options));
  }
}
