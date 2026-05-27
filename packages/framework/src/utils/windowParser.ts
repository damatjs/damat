export function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like "1m", "5m", "1h", "1d"`);
  }

  const valueStr = match[1];
  const unit = match[2];

  if (!valueStr || !unit) {
    throw new Error(`Invalid window format: ${window}. Use format like "1m", "5m", "1h", "1d"`);
  }

  const value = parseInt(valueStr, 10);

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    throw new Error(`Invalid window unit: ${unit}. Use s, m, h, or d.`);
  }

  return value * multiplier;
}
