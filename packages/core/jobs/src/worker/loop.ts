import {
  heartbeatWorker,
  markWorkerStopping,
  stopWorker,
} from "@damatjs/durability";
import { getLogger } from "@damatjs/logger";
import { DEFAULT_JOB_QUEUE } from "../definitions/defaults";
import { registerJobWorker } from "./boot";
import { executeJobClaim } from "./execute";
import { pollJobClaims } from "./poll";
import { waitForJobDrain } from "./stop";
import type { JobWorkerOptions } from "./types";

type RequiredOption =
  | "queue"
  | "concurrency"
  | "pollIntervalMs"
  | "leaseMs"
  | "heartbeatIntervalMs";

export class JobWorker {
  readonly id: string;
  private readonly options: Required<Pick<JobWorkerOptions, RequiredOption>> &
    JobWorkerOptions;
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private active = new Set<Promise<void>>();
  private bootTask: Promise<void> | undefined;
  constructor(options: JobWorkerOptions = {}) {
    this.id = options.workerId ?? crypto.randomUUID();
    this.options = {
      ...options,
      queue: options.queue ?? DEFAULT_JOB_QUEUE,
      concurrency: options.concurrency ?? 1,
      pollIntervalMs: options.pollIntervalMs ?? 1_000,
      leaseMs: options.leaseMs ?? 30_000,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 10_000,
    };
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
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    await this.bootTask?.catch(() => {});
    await markWorkerStopping({ id: this.id }).catch(() => {});
    await waitForJobDrain(this.active, options.graceMs ?? 30_000);
    await stopWorker({ id: this.id }).catch(() => {});
    this.bootTask = undefined;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private async boot(): Promise<void> {
    await registerJobWorker({
      id: this.id,
      queue: this.options.queue,
      concurrency: this.options.concurrency,
    });
    await this.tick();
  }

  private async tick(): Promise<void> {
    if (!this.running) return;
    const capacity = this.options.concurrency - this.active.size;
    const claims = await pollJobClaims(this.options, this.id, this.active.size);
    for (const claim of claims)
      this.track(executeJobClaim(claim, this.options));
    await heartbeatWorker({ id: this.id, inFlight: this.active.size });
    if (!this.running) return;
    this.timer = setTimeout(
      () =>
        void this.tick().catch((error) =>
          getLogger().error("Job worker poll failed", error),
        ),
      claims.length === capacity && capacity > 0
        ? 0
        : this.options.pollIntervalMs,
    );
  }

  private track(task: Promise<void>): void {
    const tracked = task.finally(() => this.active.delete(tracked));
    this.active.add(tracked);
  }
}
