export type InspectionVisibility = "full" | "metadata" | "hidden";

export interface CursorPosition {
  sortTimestamp: string;
  id: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface TimeRange {
  from?: Date;
  to?: Date;
}

export interface TimeBucketOptions {
  from: Date;
  to: Date;
  intervalMs: number;
}

export interface WorkSummaryFilter extends TimeBucketOptions {
  now?: Date;
  staleAfterMs?: number;
}

export interface BoundedRetentionRequest {
  terminalBefore?: Date;
  batchSize?: number;
}
