export const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgRed: "\x1b[41m",
} as const;

export const LEVEL_STYLES = {
  debug: { color: COLORS.cyan, badge: "◯", label: "DEBUG" },
  info: { color: COLORS.blue, badge: "●", label: "INFO " },
  progress: { color: COLORS.blue, badge: "⟳", label: "PROG " },
  waiting: { color: COLORS.magenta, badge: "░", label: "WAITING" },
  cached: { color: COLORS.cyan, badge: "⚡", label: "CACHE" },
  success: { color: COLORS.green, badge: "✓", label: "OK   " },
  warn: { color: COLORS.yellow, badge: "▲", label: "WARN " },
  error: { color: COLORS.red, badge: "✗", label: "ERROR" },
  fatal: { color: COLORS.bgRed + COLORS.white, badge: "☠", label: "FATAL" },
  skip: { color: COLORS.dim, badge: "→", label: "SKIP " },
} as const;

export const LOG_LEVELS = {
  debug: 0,
  info: 1,
  progress: 2,
  waiting: 3,
  cached: 4,
  success: 5,
  warn: 6,
  error: 7,
  fatal: 8,
  skip: 9,
} as const;
