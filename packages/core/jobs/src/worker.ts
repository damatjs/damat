import { getLogger } from "@damatjs/logger";
import type { QueueJob } from "@damatjs/redis";
import { getJobQueue, type JobQueueOptions } from "./enqueue";
import { getJobDefinition } from "./registry";
import { DEFAULT_JOB_OPTIONS, type JobEnvelope } from "./types";

export interface JobWorkerOptions extends JobQueueOptions {
  /** Max jobs processed simultaneously (default 1). */
  concurrency?: number;
  /** Idle wait between polls when the queue is empty, in ms (default 1000). */
  pollIntervalMs?: number;
}

/**
 * The polling worker that executes queued jobs:
 *
 * - pulls up to `concurrency` jobs per tick from the queue (delayed/backoff
 *   jobs only become visible once their score is due; jobs from crashed
 *   workers are redelivered via the queue's visibility timeout);
 * - a failing job retries with exponential backoff until its `maxAttempts`,
 *   then dead-letters into the queue's `failed` set with the error kept;
 * - an unknown job name (no `defineJob` in this process) dead-letters
 *   immediately — deploy the code that defines it, don't guess;
 * - `stop()` stops polling and waits for in-flight jobs to settle.
 */
export class JobWorker {
  private readonly options: Required<Pick<JobWorkerOptions, "concurrency" | "pollIntervalMs">> &
    JobQueueOptions;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = new Set<Promise<void>>();

  constructor(options: JobWorkerOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 1,
      pollIntervalMs: options.pollIntervalMs ?? 1000,
      ...(options.queueName !== undefined ? { queueName: options.queueName } : {}),
      ...(options.client !== undefined ? { client: options.client } : {}),
      ...(options.visibilityTimeoutMs !== undefined
        ? { visibilityTimeoutMs: options.visibilityTimeoutMs }
        : {}),
    };
  }

  /** Begin polling. Idempotent; returns immediately (the loop is async). */
  start(): void {
    if (this.running) return;
    this.running = true;
    getLogger().info("Job worker started", {
      queue: this.options.queueName ?? "damat-jobs",
      concurrency: this.options.concurrency,
    });
    void this.tick();
  }

  /** Stop polling and wait for in-flight jobs to finish. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await Promise.allSettled(this.inFlight);
    getLogger().info("Job worker stopped");
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** One poll: fill free capacity, then schedule the next poll. */
  private async tick(): Promise<void> {
    if (!this.running) return;

    let dequeued = 0;
    const capacity = this.options.concurrency - this.inFlight.size;
    if (capacity > 0) {
      try {
        const jobs = await getJobQueue(this.options).dequeue(capacity);
        dequeued = jobs.length;
        for (const job of jobs) {
          const run = this.process(job).finally(() => this.inFlight.delete(run));
          this.inFlight.add(run);
        }
      } catch (e) {
        getLogger().error(
          "Job dequeue failed — retrying next poll",
          e instanceof Error ? e : new Error(String(e)),
        );
      }
    }

    if (!this.running) return;
    // A full batch means there is likely more waiting — poll again at once.
    const delay = dequeued === capacity && dequeued > 0 ? 0 : this.options.pollIntervalMs;
    this.timer = setTimeout(() => void this.tick(), delay);
  }

  /** Execute one job with retry/dead-letter semantics. Never throws. */
  async process(job: QueueJob<JobEnvelope>): Promise<void> {
    const queue = getJobQueue(this.options);
    const logger = getLogger();
    const definition = getJobDefinition(job.data.job);

    if (!definition) {
      logger.error(`Unknown job "${job.data.job}" — dead-lettered (define it before enqueueing)`);
      await queue.updateStatus({
        ...job,
        status: "failed",
        error: `Unknown job "${job.data.job}" — no defineJob() in this process`,
        completedAt: new Date(),
      });
      return;
    }

    const attempt = job.attempts + 1;
    try {
      await definition.handler(job.data.payload, job);
      await queue.updateStatus({
        ...job,
        attempts: attempt,
        status: "completed",
        completedAt: new Date(),
      });
      logger.debug("Job completed", { job: job.data.job, id: job.id, attempt });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      const maxAttempts = job.maxAttempts || definition.options.maxAttempts;

      if (attempt >= maxAttempts) {
        await queue.updateStatus({
          ...job,
          attempts: attempt,
          status: "failed",
          error,
          completedAt: new Date(),
        });
        logger.error(
          `Job "${job.data.job}" dead-lettered after ${attempt} attempt(s): ${error}`,
        );
        return;
      }

      const backoffMs =
        (definition.options.backoffMs ?? DEFAULT_JOB_OPTIONS.backoffMs) *
        Math.pow(
          definition.options.backoffMultiplier ?? DEFAULT_JOB_OPTIONS.backoffMultiplier,
          attempt - 1,
        );
      await queue.updateStatus({
        ...job,
        attempts: attempt,
        status: "retrying",
        error,
        delay: backoffMs,
      });
      logger.warn(`Job "${job.data.job}" failed (attempt ${attempt}/${maxAttempts}) — retrying in ${backoffMs}ms`, {
        id: job.id,
        error,
      });
    }
  }
}
