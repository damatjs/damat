import { getRedis } from "../singleton";
import { Redis } from "@damatjs/deps/ioredis";
import { DEFAULT_MAX_TERMINAL_ENTRIES, PRIORITY_SCORES } from "./constant";
import { DEQUEUE_SCRIPT } from "./scripts";
import { QueueJob, QueueStats, RedisQueueOptions } from "./types";

export class RedisQueue<TData = unknown> {
  private readonly keyPrefix: string;
  private readonly redis: Redis;
  private readonly visibilityTimeoutMs: number | undefined;
  private readonly maxCompletedEntries: number;
  private readonly maxFailedEntries: number;

  constructor(queueName: string, redis?: Redis, options?: RedisQueueOptions) {
    this.keyPrefix = `queue:${queueName}`;
    this.redis = redis ?? getRedis();
    this.visibilityTimeoutMs = options?.visibilityTimeoutMs;
    this.maxCompletedEntries =
      options?.maxCompletedEntries ?? DEFAULT_MAX_TERMINAL_ENTRIES;
    this.maxFailedEntries =
      options?.maxFailedEntries ?? DEFAULT_MAX_TERMINAL_ENTRIES;
  }

  async enqueue(job: QueueJob<TData>): Promise<void> {
    const priorityScore = PRIORITY_SCORES[job.priority] ?? 2;
    const score = Date.now() + (job.delay ?? 0) - priorityScore * 1000;

    await this.redis
      .pipeline()
      .hset(`${this.keyPrefix}:jobs`, job.id, JSON.stringify(job))
      .zadd(`${this.keyPrefix}:pending`, score, job.id)
      .exec();
  }

  async dequeue(count: number): Promise<QueueJob<TData>[]> {
    const now = Date.now();
    const reclaimBefore = this.visibilityTimeoutMs
      ? now - this.visibilityTimeoutMs
      : -1;

    const jobIds = (await this.redis.eval(
      DEQUEUE_SCRIPT,
      2,
      `${this.keyPrefix}:pending`,
      `${this.keyPrefix}:processing`,
      now,
      reclaimBefore,
      count,
    )) as string[];

    if (jobIds.length === 0) return [];

    const jobDataArray = await this.redis.hmget(
      `${this.keyPrefix}:jobs`,
      ...jobIds,
    );

    return jobDataArray
      .filter((data): data is string => data !== null)
      .map((data: string) => JSON.parse(data) as QueueJob<TData>);
  }

  async updateStatus(job: QueueJob<TData>): Promise<void> {
    const statusSet =
      job.status === "completed"
        ? "completed"
        : job.status === "failed"
          ? "failed"
          : "pending";

    const cap =
      statusSet === "completed"
        ? this.maxCompletedEntries
        : statusSet === "failed"
          ? this.maxFailedEntries
          : undefined;

    // A re-queue (retrying/pending) honors the job's delay and priority just
    // like enqueue, so retry backoff actually defers redelivery; terminal
    // sets keep plain completion-time scores.
    const priorityScore = PRIORITY_SCORES[job.priority] ?? 2;
    const score =
      statusSet === "pending"
        ? Date.now() + (job.delay ?? 0) - priorityScore * 1000
        : Date.now();

    const pipeline = this.redis
      .pipeline()
      .hset(`${this.keyPrefix}:jobs`, job.id, JSON.stringify(job))
      .zrem(`${this.keyPrefix}:processing`, job.id)
      .zadd(`${this.keyPrefix}:${statusSet}`, score, job.id);

    // Trim the terminal set to its cap in the same pipeline as the add, so the
    // `:completed` / `:failed` sets stay bounded. Rank -cap-1 keeps the newest
    // `cap` entries (highest scores) and drops the oldest.
    if (cap !== undefined && cap > 0) {
      pipeline.zremrangebyrank(`${this.keyPrefix}:${statusSet}`, 0, -cap - 1);
    }

    await pipeline.exec();
  }

  async getJob(jobId: string): Promise<QueueJob<TData> | null> {
    const data = await this.redis.hget(`${this.keyPrefix}:jobs`, jobId);
    return data ? (JSON.parse(data) as QueueJob<TData>) : null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const removed = await this.redis.zrem(`${this.keyPrefix}:pending`, jobId);
    if (removed > 0) {
      await this.redis.hdel(`${this.keyPrefix}:jobs`, jobId);
      return true;
    }
    return false;
  }

  async getStats(): Promise<QueueStats> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.redis.zcard(`${this.keyPrefix}:pending`),
      this.redis.zcard(`${this.keyPrefix}:processing`),
      this.redis.zcard(`${this.keyPrefix}:completed`),
      this.redis.zcard(`${this.keyPrefix}:failed`),
    ]);
    return { pending, processing, completed, failed };
  }

  async clear(): Promise<void> {
    await this.redis
      .pipeline()
      .del(`${this.keyPrefix}:pending`)
      .del(`${this.keyPrefix}:processing`)
      .del(`${this.keyPrefix}:completed`)
      .del(`${this.keyPrefix}:failed`)
      .del(`${this.keyPrefix}:jobs`)
      .exec();
  }
}
