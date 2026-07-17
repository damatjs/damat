const MAX_TIMER_MS = 2_147_483_647;

export function resolveShutdownGraceMs(
  value: number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0 || value > MAX_TIMER_MS) {
    throw new Error(`shutdownGraceMs must be between 0 and ${MAX_TIMER_MS}`);
  }
  return value;
}
