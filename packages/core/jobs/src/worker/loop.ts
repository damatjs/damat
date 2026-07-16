import { getLogger } from "@damatjs/logger";
import { ActiveExecutions } from "./active";
import { workerDependencies, type WorkerDependencies } from "./dependencies";
import { resolveWorkerOptions } from "./options";
import { WorkerPollLoop } from "./poll-loop";
import { WorkerRegistryHeartbeat } from "./registry-heartbeat";
import { WorkerShutdown } from "./shutdown";
import type { ClaimedJobRun, JobWorkerOptions } from "./types";

export class JobWorker {
  readonly id: string;
  private running = false;
  private registered = false;
  private bootTask?: Promise<void>;
  private stopTask?: Promise<void>;
  private readonly options;
  private readonly active: ActiveExecutions;
  private readonly poll: WorkerPollLoop;
  private readonly heartbeat: WorkerRegistryHeartbeat;
  private readonly shutdown: WorkerShutdown;

  constructor(
    options: JobWorkerOptions = {},
    private readonly dependencies: WorkerDependencies = workerDependencies,
  ) {
    this.id = options.workerId ?? crypto.randomUUID();
    this.options = resolveWorkerOptions(options);
    this.shutdown = new WorkerShutdown(
      this.id,
      dependencies,
      () => this.active,
    );
    this.active = new ActiveExecutions(() => void this.shutdown.onEmpty());
    const count = () => this.active.size;
    this.poll = new WorkerPollLoop(
      this.id,
      this.options,
      dependencies,
      count,
      (claim) => this.startClaim(claim),
    );
    this.heartbeat = new WorkerRegistryHeartbeat(
      this.id,
      this.options,
      dependencies,
      count,
    );
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.bootTask = this.boot();
    void this.bootTask.catch((error) => {
      this.running = false;
      getLogger().error("Job worker failed to start", error);
    });
  }

  async stop(options: { graceMs?: number } = {}): Promise<void> {
    if (!this.running && !this.bootTask) return;
    if (this.stopTask) return this.stopTask;
    this.stopTask = this.stopInternal(options.graceMs ?? 30_000);
    return this.stopTask;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private async boot(): Promise<void> {
    await this.dependencies.register({
      id: this.id,
      queue: this.options.queue,
      concurrency: this.options.concurrency,
    });
    this.registered = true;
    if (!this.running) return;
    this.poll.start();
    this.heartbeat.start();
  }

  private async stopInternal(graceMs: number): Promise<void> {
    this.running = false;
    await Promise.all([this.poll.stop(), this.heartbeat.stop()]);
    await this.bootTask?.catch(() => {});
    if (!this.registered) return;
    await this.shutdown.begin(graceMs);
  }

  private startClaim(claim: ClaimedJobRun): void {
    if (!this.running) return;
    this.active.track(this.dependencies.startExecution(claim, this.options));
  }
}
