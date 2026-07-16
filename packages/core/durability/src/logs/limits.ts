import type {
  LimitedWorkLogs,
  WorkLogEntry,
  WorkLogLimits,
} from "./types";

const encoder = new TextEncoder();

function entryBytes(entry: WorkLogEntry): number {
  return encoder.encode(JSON.stringify(entry)).byteLength;
}

export function applyLogLimits(
  entries: WorkLogEntry[],
  limits: WorkLogLimits,
): LimitedWorkLogs {
  if (
    !Number.isSafeInteger(limits.maxCount) ||
    !Number.isSafeInteger(limits.maxBytes) ||
    limits.maxCount < 0 ||
    limits.maxBytes < 0
  ) {
    throw new Error("Log limits must be finite nonnegative integers");
  }
  const retained: WorkLogEntry[] = [];
  let retainedBytes = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index]!;
    const bytes = entryBytes(entry);
    if (retained.length >= limits.maxCount) break;
    if (retainedBytes + bytes > limits.maxBytes) break;
    retained.unshift(entry);
    retainedBytes += bytes;
  }
  const totalBytes = entries.reduce((sum, entry) => sum + entryBytes(entry), 0);
  const droppedCount = entries.length - retained.length;
  return {
    entries: retained,
    droppedCount,
    droppedBytes: totalBytes - retainedBytes,
    truncated: droppedCount > 0,
  };
}
