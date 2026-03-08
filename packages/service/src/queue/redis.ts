/**
 * Queue Service - Redis Queue Operations
 *
 * Operations for managing jobs in a Redis-backed queue (production).
 */

import type { Redis } from "@damatjs/deps/ioredis";
import type { Job } from "./types";
import { PRIORITY_SCORES } from "./defaults";

/**
 * Redis queue operations
 */
export class RedisQueue<TData> {
  private readonly keyPrefix: string;

  constructor(
    private readonly redis: Redis,
    queueName: string,
  ) {
    this.keyPrefix = `queue:${queueName}`;
  }

  /**
   * Add a job to the queue
   */
  async enqueue(job: Job<TData>): Promise<void> {
    const score =
      Date.now() + (job.delay ?? 0) - PRIORITY_SCORES[job.priority] * 1000;

    await this.redis
      .pipeline()
      .hset(`${this.keyPrefix}:jobs`, job.id, JSON.stringify(job))
      .zadd(`${this.keyPrefix}:pending`, score, job.id)
      .exec();
  }

  /**
   * Remove and return jobs ready for processing
   */
  async dequeue(count: number): Promise<Job<TData>[]> {
    const now = Date.now();

    // Get jobs ready for processing (score <= now)
    const jobIds = await this.redis.zrangebyscore(
      `${this.keyPrefix}:pending`,
      0,
      now,
      "LIMIT",
      0,
      count,
    );

    if (jobIds.length === 0) return [];

    // Move jobs to processing set atomically
    const pipeline = this.redis.pipeline();
    for (const id of jobIds) {
      pipeline.zrem(`${this.keyPrefix}:pending`, id);
      pipeline.zadd(`${this.keyPrefix}:processing`, now, id);
    }
    await pipeline.exec();

    // Fetch job data
    const jobDataArray = await this.redis.hmget(
      `${this.keyPrefix}:jobs`,
      ...jobIds,
    );

    return jobDataArray
      .filter((data): data is string => data !== null)
      .map((data) => JSON.parse(data) as Job<TData>);
  }

  /**
   * Update a job's status
   */
  async updateStatus(job: Job<TData>): Promise<void> {
    const statusSet =
      job.status === "completed"
        ? "completed"
        : job.status === "failed"
          ? "failed"
          : "pending";

    await this.redis
      .pipeline()
      .hset(`${this.keyPrefix}:jobs`, job.id, JSON.stringify(job))
      .zrem(`${this.keyPrefix}:processing`, job.id)
      .zadd(`${this.keyPrefix}:${statusSet}`, Date.now(), job.id)
      .exec();
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job<TData> | null> {
    const data = await this.redis.hget(`${this.keyPrefix}:jobs`, jobId);
    return data ? (JSON.parse(data) as Job<TData>) : null;
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const removed = await this.redis.zrem(`${this.keyPrefix}:pending`, jobId);
    if (removed > 0) {
      await this.redis.hdel(`${this.keyPrefix}:jobs`, jobId);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.redis.zcard(`${this.keyPrefix}:pending`),
      this.redis.zcard(`${this.keyPrefix}:processing`),
      this.redis.zcard(`${this.keyPrefix}:completed`),
      this.redis.zcard(`${this.keyPrefix}:failed`),
    ]);
    return { pending, processing, completed, failed };
  }

  /**
   * Clear all jobs from the queue
   */
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
