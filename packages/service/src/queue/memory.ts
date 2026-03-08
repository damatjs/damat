/**
 * Queue Service - In-Memory Queue Operations
 *
 * Operations for managing jobs in an in-memory queue (development/testing).
 */

import type { Job } from "./types";
import { PRIORITY_SCORES } from "./defaults";

/**
 * In-memory queue storage
 */
export class MemoryQueue<TData> {
  private queue: Job<TData>[] = [];

  /**
   * Add a job to the queue
   */
  enqueue(job: Job<TData>, onReady?: () => void): void {
    if (job.delay) {
      setTimeout(() => {
        this.queue.push(job);
        onReady?.();
      }, job.delay);
    } else {
      this.queue.push(job);
      onReady?.();
    }
  }

  /**
   * Remove and return jobs from the queue
   * Jobs are sorted by priority (highest first)
   */
  dequeue(count: number): Job<TData>[] {
    // Sort by priority and take the requested count
    this.queue.sort(
      (a, b) => PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority],
    );
    return this.queue.splice(0, count);
  }

  /**
   * Find a job by ID
   */
  findById(jobId: string): Job<TData> | undefined {
    return this.queue.find((j) => j.id === jobId);
  }

  /**
   * Remove a job by ID
   */
  removeById(jobId: string): boolean {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get the number of jobs in the queue
   */
  get length(): number {
    return this.queue.length;
  }

  /**
   * Clear all jobs from the queue
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Schedule a retry by adding the job back to the queue after a delay
   */
  scheduleRetry(job: Job<TData>, delayMs: number, onReady?: () => void): void {
    setTimeout(() => {
      this.queue.push(job);
      onReady?.();
    }, delayMs);
  }
}
