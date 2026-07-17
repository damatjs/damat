import type { WorkSummaryFilter } from "./types";

const MAX_BUCKETS = 1_000;

export interface ValidatedSummaryFilter {
  bucketCount: number;
}

export function validateWorkSummaryFilter(
  filter: WorkSummaryFilter,
): ValidatedSummaryFilter {
  validateDate(filter.from);
  validateDate(filter.to);
  if (!Number.isSafeInteger(filter.intervalMs) || filter.intervalMs < 1) {
    throw new Error("summary interval must be a positive safe integer");
  }
  if (filter.to < filter.from) throw new Error("invalid summary range");
  validateOptionalDate(filter.now);
  validateOptionalDuration(filter.staleAfterMs);
  if (filter.to.getTime() === filter.from.getTime()) {
    return { bucketCount: 0 };
  }
  const first = Math.floor(filter.from.getTime() / filter.intervalMs);
  const last = Math.floor((filter.to.getTime() - 1) / filter.intervalMs);
  const bucketCount = last - first + 1;
  if (bucketCount > MAX_BUCKETS) {
    throw new Error("summary range cannot exceed 1,000 buckets");
  }
  return { bucketCount };
}

function validateDate(value: Date): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error("summary range requires valid dates");
  }
}

function validateOptionalDate(value: Date | undefined): void {
  if (value !== undefined) validateDate(value);
}

function validateOptionalDuration(value: number | undefined): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
    throw new Error("staleAfterMs must be a positive safe integer");
  }
}
