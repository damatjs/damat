export function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like "1m", "5m", "1h", "1d"`);
  }

  // The regex guarantees a numeric value group and a unit group constrained to
  // exactly the keys below, so both are always present and always map to a
  // multiplier — no further guards are reachable.
  const value = parseInt(match[1]!, 10);

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };

  return value * multipliers[match[2]!]!;
}
