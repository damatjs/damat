/**
 * Base Queue Service - Background Job Processing Template
 *
 * Provides a foundation for services that process background jobs.
 * Supports both in-memory (development) and Redis-backed (production) queues.
 *
 * @example
 * ```typescript
 * interface EmailJobData {
 *     to: string;
 *     subject: string;
 *     body: string;
 * }
 *
 * class EmailQueueService extends BaseQueueService<EmailJobData> {
 *     constructor(logger: Logger, redisClient?: Redis) {
 *         super({
 *             queueName: 'email',
 *             concurrency: 5,
 *             retryAttempts: 3,
 *             logger,
 *             redisClient,
 *         });
 *     }
 *
 *     protected async process(job: Job<EmailJobData>): Promise<void> {
 *         await sendEmail(job.data);
 *     }
 * }
 *
 * // Usage
 * const emailQueue = new EmailQueueService(logger, redisClient);
 * emailQueue.start();
 * await emailQueue.enqueue({ to: 'user@example.com', subject: 'Hello', body: '...' });
 * ```
 */

// Types
export type * from "./types";

// Base class
export * from "./base";
