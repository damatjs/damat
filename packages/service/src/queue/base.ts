/**
 * Queue Service - Base Class
 *
 * Abstract base class for queue-based services.
 * Supports both in-memory (development) and Redis-backed (production) queues.
 */

import type { ILogger } from "@damatjs/utils";
import { nanoid } from "@damatjs/deps/nanoid";
import type {
  Job,
  QueueConfig,
  ResolvedQueueConfig,
  EnqueueOptions,
  QueueStats,
} from "./types";
import { DEFAULT_QUEUE_CONFIG } from "./defaults";
import { MemoryQueue } from "./memory";
import { RedisQueue } from "./redis";

/**
 * Abstract base class for queue-based services
 *
 * @template TData - The job data type
 */
export abstract class BaseQueueService<TData = unknown> {
  protected readonly log: ILogger;
  protected readonly config: ResolvedQueueConfig;

  // Queue implementations
  private readonly memoryQueue: MemoryQueue<TData>;
  private readonly redisQueue: RedisQueue<TData> | null;

  // Processing state
  private processingJobs: Map<string, Job<TData>> = new Map();
  private isProcessing = false;
  private processingCount = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: QueueConfig) {
    this.config = {
      ...DEFAULT_QUEUE_CONFIG,
      ...config,
    } as ResolvedQueueConfig;

    this.log = config.logger.child({
      queue: config.queueName,
    });

    // Initialize memory queue
    this.memoryQueue = new MemoryQueue<TData>();

    // Initialize Redis queue if configured
    if (this.config.useRedis && this.config.redisClient) {
      this.redisQueue = new RedisQueue<TData>(
        this.config.redisClient,
        config.queueName,
      );
    } else {
      this.redisQueue = null;
      if (this.config.useRedis) {
        this.log.warn(
          "Redis is enabled but no redisClient was provided to QueueConfig. Falling back to in-memory queue.",
        );
        this.config.useRedis = false;
      }
    }
  }

  /**
   * Process a job - must be implemented by subclasses
   */
  protected abstract process(job: Job<TData>): Promise<void>;

  // =========================================================================
  // ENQUEUEING
  // =========================================================================

  /**
   * Add a job to the queue
   */
  async enqueue(
    data: TData,
    options: EnqueueOptions = {},
  ): Promise<Job<TData>> {
    const job: Job<TData> = {
      id: options.jobId ?? nanoid(),
      queue: this.config.queueName,
      data,
      status: "pending",
      priority: options.priority ?? "normal",
      attempts: 0,
      maxAttempts: options.maxAttempts ?? this.config.retryAttempts,
      createdAt: new Date(),
      ...(options.delay !== undefined && { delay: options.delay }),
      ...(options.metadata !== undefined && { metadata: options.metadata }),
    };

    if (this.config.useRedis && this.redisQueue) {
      await this.redisQueue.enqueue(job);
    } else {
      this.memoryQueue.enqueue(job, () => {
        if (this.isProcessing) {
          this.processNextBatch();
        }
      });
    }

    this.log.debug("Job enqueued", { jobId: job.id, priority: job.priority });
    return job;
  }

  /**
   * Add multiple jobs to the queue
   */
  async enqueueBatch(
    items: Array<{ data: TData; options?: EnqueueOptions }>,
  ): Promise<Job<TData>[]> {
    const jobs = await Promise.all(
      items.map((item) => this.enqueue(item.data, item.options)),
    );
    this.log.debug("Batch enqueued", { count: jobs.length });
    return jobs;
  }

  // =========================================================================
  // PROCESSING
  // =========================================================================

  /**
   * Start processing jobs from the queue
   */
  start(): void {
    if (this.isProcessing) {
      this.log.warn("Queue processor already running");
      return;
    }

    this.isProcessing = true;
    this.log.info("Starting queue processor", {
      concurrency: this.config.concurrency,
    });

    if (this.config.useRedis) {
      // Poll Redis queue
      this.pollTimer = setInterval(() => {
        this.processNextBatch();
      }, this.config.pollIntervalMs);
    } else {
      // Process memory queue immediately
      this.processNextBatch();
    }
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    this.isProcessing = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.log.info("Queue processor stopped");
  }

  /**
   * Process the next batch of jobs
   */
  private async processNextBatch(): Promise<void> {
    if (!this.isProcessing) return;

    const availableSlots = this.config.concurrency - this.processingCount;
    if (availableSlots <= 0) return;

    const jobs = await this.dequeueJobs(availableSlots);
    await Promise.all(jobs.map((job) => this.processJob(job)));
  }

  /**
   * Dequeue jobs from the appropriate queue
   */
  private async dequeueJobs(count: number): Promise<Job<TData>[]> {
    if (this.config.useRedis && this.redisQueue) {
      return this.redisQueue.dequeue(count);
    }
    return this.memoryQueue.dequeue(count);
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job<TData>): Promise<void> {
    this.processingCount++;
    this.processingJobs.set(job.id, job);

    try {
      job.status = "processing";
      job.startedAt = new Date();
      job.attempts++;

      this.log.debug("Processing job", {
        jobId: job.id,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
      });

      // Execute with timeout
      await Promise.race([
        this.process(job),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(`Job timed out after ${this.config.jobTimeoutMs}ms`),
            );
          }, this.config.jobTimeoutMs);
        }),
      ]);

      // Mark as completed
      job.status = "completed";
      job.completedAt = new Date();
      await this.updateJobStatus(job);

      this.log.debug("Job completed", { jobId: job.id });
    } catch (error) {
      await this.handleJobError(job, error);
    } finally {
      this.processingCount--;
      this.processingJobs.delete(job.id);

      // Continue processing if there are more jobs
      if (this.isProcessing && !this.config.useRedis) {
        setImmediate(() => this.processNextBatch());
      }
    }
  }

  /**
   * Handle job processing error
   */
  private async handleJobError(job: Job<TData>, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    job.error = errorMessage;

    this.log.error(
      "Job failed",
      error instanceof Error ? error : new Error(errorMessage),
      {
        jobId: job.id,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
      },
    );

    if (job.attempts < job.maxAttempts) {
      // Retry the job
      job.status = "retrying";
      await this.scheduleRetry(job);
    } else {
      // Max retries exceeded
      job.status = "failed";
      await this.updateJobStatus(job);
    }
  }

  /**
   * Schedule a job retry
   */
  private async scheduleRetry(job: Job<TData>): Promise<void> {
    const delay = this.config.retryDelayMs * Math.pow(2, job.attempts - 1);

    this.log.debug("Scheduling retry", {
      jobId: job.id,
      attempt: job.attempts,
      delayMs: delay,
    });

    job.delay = delay;
    job.status = "pending";

    if (this.config.useRedis && this.redisQueue) {
      await this.redisQueue.enqueue(job);
    } else {
      this.memoryQueue.scheduleRetry(job, delay, () => {
        if (this.isProcessing) {
          this.processNextBatch();
        }
      });
    }
  }

  /**
   * Update job status in Redis
   */
  private async updateJobStatus(job: Job<TData>): Promise<void> {
    if (this.config.useRedis && this.redisQueue) {
      await this.redisQueue.updateStatus(job);
    }
  }

  // =========================================================================
  // QUEUE MANAGEMENT
  // =========================================================================

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    if (this.config.useRedis && this.redisQueue) {
      const stats = await this.redisQueue.getStats();
      return {
        ...stats,
        total:
          stats.pending + stats.processing + stats.completed + stats.failed,
      };
    }

    return {
      pending: this.memoryQueue.length,
      processing: this.processingJobs.size,
      completed: 0, // Not tracked in memory mode
      failed: 0,
      total: this.memoryQueue.length + this.processingJobs.size,
    };
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job<TData> | null> {
    if (this.config.useRedis && this.redisQueue) {
      return this.redisQueue.getJob(jobId);
    }

    const job = this.memoryQueue.findById(jobId);
    return job ?? this.processingJobs.get(jobId) ?? null;
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    if (this.config.useRedis && this.redisQueue) {
      return this.redisQueue.cancelJob(jobId);
    }

    return this.memoryQueue.removeById(jobId);
  }

  /**
   * Clear all jobs from the queue
   */
  async clear(): Promise<void> {
    if (this.config.useRedis && this.redisQueue) {
      await this.redisQueue.clear();
    } else {
      this.memoryQueue.clear();
    }

    this.log.info("Queue cleared");
  }
}
