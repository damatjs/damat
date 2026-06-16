import { describe, it, expect } from "bun:test";
import { COLORS, LEVEL_STYLES, LOG_LEVELS } from "../colors";

describe("colors: COLORS table", () => {
  it("uses standard ANSI escape sequences", () => {
    expect(COLORS.reset).toBe("\x1b[0m");
    expect(COLORS.bold).toBe("\x1b[1m");
    expect(COLORS.dim).toBe("\x1b[2m");
    expect(COLORS.red).toBe("\x1b[31m");
    expect(COLORS.green).toBe("\x1b[32m");
    expect(COLORS.yellow).toBe("\x1b[33m");
    expect(COLORS.blue).toBe("\x1b[34m");
    expect(COLORS.magenta).toBe("\x1b[35m");
    expect(COLORS.cyan).toBe("\x1b[36m");
    expect(COLORS.bgRed).toBe("\x1b[41m");
  });
});

describe("colors: LEVEL_STYLES", () => {
  const levels = [
    "debug",
    "info",
    "progress",
    "waiting",
    "cached",
    "success",
    "warn",
    "error",
    "fatal",
    "skip",
  ] as const;

  it("has a style for every level", () => {
    for (const level of levels) {
      expect(LEVEL_STYLES[level]).toBeDefined();
      expect(LEVEL_STYLES[level].color).toBeString();
      expect(LEVEL_STYLES[level].badge).toBeString();
      expect(LEVEL_STYLES[level].label).toBeString();
    }
  });

  it("maps each level to the expected color", () => {
    expect(LEVEL_STYLES.debug.color).toBe(COLORS.cyan);
    expect(LEVEL_STYLES.info.color).toBe(COLORS.blue);
    expect(LEVEL_STYLES.progress.color).toBe(COLORS.blue);
    expect(LEVEL_STYLES.waiting.color).toBe(COLORS.magenta);
    expect(LEVEL_STYLES.cached.color).toBe(COLORS.cyan);
    expect(LEVEL_STYLES.success.color).toBe(COLORS.green);
    expect(LEVEL_STYLES.warn.color).toBe(COLORS.yellow);
    expect(LEVEL_STYLES.error.color).toBe(COLORS.red);
    // fatal combines two codes
    expect(LEVEL_STYLES.fatal.color).toBe(COLORS.bgRed + COLORS.white);
    expect(LEVEL_STYLES.skip.color).toBe(COLORS.dim);
  });

  it("uses distinct badges", () => {
    expect(LEVEL_STYLES.debug.badge).toBe("◯");
    expect(LEVEL_STYLES.success.badge).toBe("✓");
    expect(LEVEL_STYLES.error.badge).toBe("✗");
    expect(LEVEL_STYLES.fatal.badge).toBe("☠");
  });
});

describe("colors: LOG_LEVELS ordering", () => {
  it("assigns a strictly increasing severity ordinal", () => {
    expect(LOG_LEVELS.debug).toBe(0);
    expect(LOG_LEVELS.info).toBe(1);
    expect(LOG_LEVELS.progress).toBe(2);
    expect(LOG_LEVELS.waiting).toBe(3);
    expect(LOG_LEVELS.cached).toBe(4);
    expect(LOG_LEVELS.success).toBe(5);
    expect(LOG_LEVELS.warn).toBe(6);
    expect(LOG_LEVELS.error).toBe(7);
    expect(LOG_LEVELS.fatal).toBe(8);
    expect(LOG_LEVELS.skip).toBe(9);
  });

  it("orders values ascending without gaps", () => {
    const values = Object.values(LOG_LEVELS);
    const sorted = [...values].sort((a, b) => a - b);
    expect(values).toEqual(sorted);
    expect(new Set(values).size).toBe(values.length);
  });
});
