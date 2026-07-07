export const PRIORITY_SCORES: Record<string, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Default cap on the `:completed` / `:failed` sets. Generous enough to be a
 * no-op for typical callers, but bounds the sets so they cannot grow forever.
 * Pass 0 (or a negative value) to a queue option to disable trimming entirely.
 */
export const DEFAULT_MAX_TERMINAL_ENTRIES = 10000;
