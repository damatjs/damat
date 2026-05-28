import { getRedis } from "../singleton";
import { Redis } from "@damatjs/deps/ioredis";
import { PRIORITY_SCORES } from "./constant";
import { QueueJob, QueueStats } from "./types";

export class RedisQueue<TData = unknown> {
  private readonly keyPrefix: string;
  private readonly redis: Redis;

  constructor(queueName: string, redis?: Redis) {
    this.keyPrefix = `queue:${queueName}`;
    this.redis = redis ?? getRedis();
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

    const jobIds = await this.redis.zrangebyscore(
      `${this.keyPrefix}:pending`,
      0,
      now,
      "LIMIT",
      0,
      count,
    );

    if (jobIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of jobIds) {
      pipeline.zrem(`${this.keyPrefix}:pending`, id);
      pipeline.zadd(`${this.keyPrefix}:processing`, now, id);
    }
    await pipeline.exec();

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

    await this.redis
      .pipeline()
      .hset(`${this.keyPrefix}:jobs`, job.id, JSON.stringify(job))
      .zrem(`${this.keyPrefix}:processing`, job.id)
      .zadd(`${this.keyPrefix}:${statusSet}`, Date.now(), job.id)
      .exec();
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
