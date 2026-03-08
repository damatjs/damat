# Queue Service Module

Base class for queue-based background job processing. Supports both in-memory (development/testing) and Redis-backed (production) queues.

## Directory Structure

```
queue/
├── types.ts      # Type definitions (Job, JobStatus, QueueConfig, etc.)
├── defaults.ts   # Default configurations and priority scores
├── memory.ts     # In-memory queue implementation
├── redis.ts      # Redis-backed queue implementation
├── base.ts       # BaseQueueService abstract class
├── index.ts      # Re-exports all public APIs
└── QUEUE.md      # This documentation
```

## Usage

### Basic Queue Service

```typescript
import { BaseQueueService } from "@damatjs/service";
import { getLogger } from "@damatjs/utils";
import { Redis } from "@damatjs/deps/ioredis";

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

class EmailQueueService extends BaseQueueService<EmailJobData> {
  constructor(redisClient?: Redis) {
    super({
      queueName: "email",
      concurrency: 5,
      retryAttempts: 3,
      logger: getLogger(), // Required
      useRedis: !!redisClient,
      redisClient,
    });
  }

  protected async process(job: Job<EmailJobData>): Promise<void> {
    await sendEmail(job.data);
  }
}

// Usage
const emailQueue = new EmailQueueService(redisClient);

// Start processing
emailQueue.start();

// Enqueue a job
await emailQueue.enqueue({
  to: "user@example.com",
  subject: "Hello",
  body: "...",
});

// Stop processing
emailQueue.stop();
```

### Job Priority

```typescript
// Enqueue with priority
await emailQueue.enqueue(
  { to: "vip@example.com", subject: "Urgent", body: "..." },
  { priority: "critical" },
);

// Priority levels (highest to lowest):
// - critical (4)
// - high (3)
// - normal (2) - default
// - low (1)
```

### Delayed Jobs

```typescript
// Process job after 5 minutes
await emailQueue.enqueue(
  { to: "user@example.com", subject: "Reminder", body: "..." },
  { delay: 5 * 60 * 1000 },
);
```

### Batch Enqueueing

```typescript
await emailQueue.enqueueBatch([
  { data: { to: "user1@example.com", subject: "Hi", body: "..." } },
  {
    data: { to: "user2@example.com", subject: "Hi", body: "..." },
    options: { priority: "high" },
  },
]);
```

## Configuration

### QueueConfig

| Property         | Type      | Required    | Default        | Description                                      |
| ---------------- | --------- | ----------- | -------------- | ------------------------------------------------ |
| `queueName`      | `string`  | Yes         | -              | Unique name for the queue                        |
| `logger`         | `Logger`  | Yes         | -              | Logger instance from `@damatjs/utils`       |
| `concurrency`    | `number`  | No          | `1`            | Max concurrent job processors                    |
| `retryAttempts`  | `number`  | No          | `3`            | Default max retry attempts per job               |
| `retryDelayMs`   | `number`  | No          | `1000`         | Base delay between retries (exponential backoff) |
| `jobTimeoutMs`   | `number`  | No          | `30000`        | Job execution timeout                            |
| `useRedis`       | `boolean` | No          | `true` in prod | Use Redis for persistence                        |
| `redisClient`    | `Redis`   | Conditional | -              | Required when `useRedis: true`                   |
| `pollIntervalMs` | `number`  | No          | `1000`         | Redis queue poll interval                        |

### EnqueueOptions

| Property      | Type                      | Default        | Description                  |
| ------------- | ------------------------- | -------------- | ---------------------------- |
| `priority`    | `JobPriority`             | `"normal"`     | Job priority level           |
| `delay`       | `number`                  | -              | Delay before processing (ms) |
| `jobId`       | `string`                  | Auto-generated | Custom job ID                |
| `metadata`    | `Record<string, unknown>` | -              | Custom metadata              |
| `maxAttempts` | `number`                  | Config value   | Override max retry attempts  |

## Job Lifecycle

```
┌─────────┐    enqueue    ┌─────────┐
│ Created │ ───────────►  │ Pending │
└─────────┘               └────┬────┘
                               │
                         start processing
                               │
                               ▼
                        ┌─────────────┐
                        │ Processing  │
                        └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
          success           failure         timeout
              │                │                │
              ▼                ▼                ▼
       ┌───────────┐    ┌───────────┐    ┌───────────┐
       │ Completed │    │  Retrying │    │  Retrying │
       └───────────┘    └─────┬─────┘    └─────┬─────┘
                              │                │
                    attempts < max      attempts >= max
                              │                │
                              ▼                ▼
                        ┌─────────┐      ┌────────┐
                        │ Pending │      │ Failed │
                        └─────────┘      └────────┘
```

## Queue Management

```typescript
// Get queue statistics
const stats = await emailQueue.getStats();
console.log(stats.pending); // Jobs waiting
console.log(stats.processing); // Jobs being processed
console.log(stats.completed); // Jobs completed (Redis only)
console.log(stats.failed); // Jobs failed (Redis only)

// Get a specific job
const job = await emailQueue.getJob("job-id");

// Cancel a pending job
const cancelled = await emailQueue.cancelJob("job-id");

// Clear all jobs
await emailQueue.clear();
```

## In-Memory vs Redis Mode

### In-Memory Mode (Development)

- Jobs stored in memory
- Lost on process restart
- No completed/failed tracking
- Immediate processing on enqueue

### Redis Mode (Production)

- Jobs persisted to Redis
- Survives process restarts
- Full job status tracking
- Polling-based processing

```typescript
// Force in-memory mode for development
const queue = new EmailQueueService(undefined);

// Use Redis in production
const queue = new EmailQueueService(redisClient);
```

## Retry Behavior

Jobs are retried with exponential backoff:

```
Attempt 1: immediate
Attempt 2: retryDelayMs * 2^0 = 1000ms
Attempt 3: retryDelayMs * 2^1 = 2000ms
Attempt 4: retryDelayMs * 2^2 = 4000ms
...
```

After `maxAttempts` failures, the job is marked as `failed`.
