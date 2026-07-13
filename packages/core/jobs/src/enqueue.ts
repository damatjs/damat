import { randomUUID } from "node:crypto";
import { RedisQueue, type QueueJob, type Redis } from "@damatjs/redis";
import { getJobDefinition } from "./registry";
import {
  DEFAULT_JOB_OPTIONS,
  DEFAULT_JOB_QUEUE,
  type JobEnvelope,
  type JobName,
  type JobPayload,
} from "./types";

// One RedisQueue instance per queue name, shared across enqueuers and
// workers in this process.
const QUEUES_KEY = Symbol.for("damatjs.jobs.queues");

function queues(): Map<string, RedisQueue<JobEnvelope>> {
  const g = globalThis as Record<symbol, Map<string, RedisQueue<JobEnvelope>> | undefined>;
  if (!g[QUEUES_KEY]) g[QUEUES_KEY] = new Map();
  return g[QUEUES_KEY];
}

export interface JobQueueOptions {
  queueName?: string;
  /** Explicit client (tests / multi-redis setups); defaults to the singleton. */
  client?: Redis;
  /** Redelivery timeout for crashed workers, ms (default 30s). */
  visibilityTimeoutMs?: number;
}

/** The shared queue for a name (created on first use). */
export function getJobQueue(options: JobQueueOptions = {}): RedisQueue<JobEnvelope> {
  const name = options.queueName ?? DEFAULT_JOB_QUEUE;
  let queue = queues().get(name);
  if (!queue) {
    queue = new RedisQueue<JobEnvelope>(name, options.client, {
      visibilityTimeoutMs: options.visibilityTimeoutMs ?? 30_000,
    });
    queues().set(name, queue);
  }
  return queue;
}

/** Drop the cached queue instances (tests). */
export function clearJobQueues(): void {
  queues().clear();
}

export interface EnqueueOptions extends JobQueueOptions {
  /** Defer first delivery by this many ms. */
  delayMs?: number;
  priority?: QueueJob["priority"];
  /** Override the definition's / default maxAttempts. */
  maxAttempts?: number;
}

/**
 * Queue a job for the worker. The job's definition doesn't have to exist in
 * THIS process (an API process can enqueue what only the worker process
 * defines) — but when it does, its options provide the defaults.
 */
export async function enqueueJob<K extends JobName>(
  name: K,
  payload: JobPayload<K>,
  options: EnqueueOptions = {},
): Promise<QueueJob<JobEnvelope>> {
  const definition = getJobDefinition(name);
  const job: QueueJob<JobEnvelope> = {
    id: randomUUID(),
    queue: options.queueName ?? DEFAULT_JOB_QUEUE,
    data: { job: name, payload },
    status: "pending",
    priority: options.priority ?? definition?.options.priority ?? DEFAULT_JOB_OPTIONS.priority,
    attempts: 0,
    maxAttempts:
      options.maxAttempts ?? definition?.options.maxAttempts ?? DEFAULT_JOB_OPTIONS.maxAttempts,
    createdAt: new Date(),
    ...(options.delayMs !== undefined ? { delay: options.delayMs } : {}),
  };
  await getJobQueue(options).enqueue(job);
  return job;
}
