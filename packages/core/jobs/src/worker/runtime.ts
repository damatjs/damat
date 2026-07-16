import { getLogger } from "@damatjs/logger";
import { ActiveExecutions } from "./active";
import type { WorkerDependencies } from "./dependencies";
import { WorkerLifecycle } from "./lifecycle";
import { resolveWorkerOptions } from "./options";
import { WorkerPollLoop } from "./poll-loop";
import { WorkerRegistryHeartbeat } from "./registry-heartbeat";
import { WorkerShutdown } from "./shutdown";
import type { ClaimedJobRun, JobWorkerOptions } from "./types";

export class JobWorkerRuntime {
  readonly id: string;
  private registered = false;
  private bootTask?: Promise<void>;
  private readonly lifecycle = new WorkerLifecycle();
  private readonly options;
  private readonly active: ActiveExecutions;
  private readonly poll: WorkerPollLoop;
  private readonly heartbeat: WorkerRegistryHeartbeat;
  private readonly shutdown: WorkerShutdown;

  constructor(
    options: JobWorkerOptions,
    private readonly deps: WorkerDependencies,
  ) {
    this.options = resolveWorkerOptions(options);
    this.id = this.options.workerId ?? crypto.randomUUID();
    this.shutdown = new WorkerShutdown(this.id, deps, () => this.active);
    this.active = new ActiveExecutions(() => void this.finalizeBackground());
    const count = () => this.active.size;
    this.poll = new WorkerPollLoop(
      this.id,
      this.options,
      deps,
      count,
      (claim) => this.startClaim(claim),
    );
    this.heartbeat = new WorkerRegistryHeartbeat(
      this.id,
      this.options,
      deps,
      count,
    );
  }

  start(): void {
    if (!this.lifecycle.start()) return;
    this.bootTask = this.boot();
    void this.bootTask.catch((error) => {
      this.lifecycle.failStart();
      getLogger().error("Job worker failed to start", error);
    });
  }

  stop(options: { graceMs?: number } = {}): Promise<void> {
    return this.lifecycle.stop(() =>
      this.stopInternal(options.graceMs ?? 30_000),
    );
  }

  get isRunning(): boolean {
    return this.lifecycle.running;
  }

  private async boot(): Promise<void> {
    await this.deps.register({
      id: this.id,
      queue: this.options.queue,
      concurrency: this.options.concurrency,
    });
    this.registered = true;
    if (!this.lifecycle.running) return;
    this.poll.start();
    this.heartbeat.start();
  }

  private async stopInternal(graceMs: number): Promise<void> {
    await Promise.all([this.poll.stop(), this.heartbeat.stop()]);
    await this.bootTask?.catch(() => {});
    if (!this.registered) return this.lifecycle.completeStop();
    await this.shutdown.begin(graceMs);
    if (this.shutdown.isStopped) this.lifecycle.completeStop();
  }

  private async finalizeBackground(): Promise<void> {
    try {
      await this.shutdown.onEmpty();
      if (this.shutdown.isStopped) this.lifecycle.completeStop();
    } catch (error) {
      getLogger().error("Job worker background finalization failed", error);
    }
  }

  private startClaim(claim: ClaimedJobRun): void {
    if (!this.lifecycle.running) return;
    this.active.track(this.deps.startExecution(claim, this.options));
  }
}
