export type WorkLogLevel = "debug" | "info" | "warn" | "error";

export interface WorkLogEntry {
  level: WorkLogLevel;
  message: string;
  data?: unknown;
}

export interface WorkLogLimits {
  maxCount: number;
  maxBytes: number;
}

export interface LimitedWorkLogs {
  entries: WorkLogEntry[];
  droppedCount: number;
  droppedBytes: number;
  truncated: boolean;
}

export interface RedactionOptions {
  keys?: string[];
  paths?: string[];
  replacement?: string;
}
