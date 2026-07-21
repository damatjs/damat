import type { TimeBucketOptions } from "./types";

export function getTimeBucketStart(date: Date, intervalMs: number): Date {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Time bucket interval must be positive");
  }
  return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
}

export function createTimeBuckets(options: TimeBucketOptions): Date[] {
  if (options.to < options.from) throw new Error("Invalid time bucket range");
  const buckets: Date[] = [];
  const start = getTimeBucketStart(options.from, options.intervalMs).getTime();
  if (options.to.getTime() === options.from.getTime()) return buckets;
  for (
    let value = start;
    value < options.to.getTime();
    value += options.intervalMs
  ) {
    buckets.push(new Date(value));
  }
  return buckets;
}
