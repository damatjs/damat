export interface ProgressSamplingOptions {
  changed: boolean;
  terminal?: boolean;
  lastRecordedAt?: Date;
  now?: Date;
  minimumIntervalMs: number;
}

export function shouldRecordProgressActivity(
  options: ProgressSamplingOptions,
): boolean {
  if (options.terminal) return true;
  if (!options.changed) return false;
  if (!options.lastRecordedAt) return true;
  const now = options.now ?? new Date();
  return (
    now.getTime() - options.lastRecordedAt.getTime() >=
    options.minimumIntervalMs
  );
}
