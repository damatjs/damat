import type { TimeRange } from "./types";

export interface WorkInspectionFilters {
  statuses?: string[];
  scope?: string;
  workerId?: string;
  correlationId?: string;
  created?: TimeRange;
  started?: TimeRange;
  finished?: TimeRange;
}
