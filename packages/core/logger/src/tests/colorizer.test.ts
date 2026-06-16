import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Colorizer } from "../colorizer";
import { COLORS, LEVEL_STYLES } from "../colors";

/**
 * Colorizer's `enabled` flag is `enabled && supportsColor()`. `supportsColor()`
 * returns true when FORCE_COLOR is set. We toggle env vars per-test to drive
 * both the "colors on" and "colors off" branches deterministically, regardless
 * of whether the test host is a TTY.
 */
const ENV_KEYS = ["NO_COLOR", "FORCE_COLOR", "TERM"] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  // Clean slate.
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function colorOn(): Colorizer {
  process.env.FORCE_COLOR = "1";
  return new Colorizer(true);
}

function colorOff(): Colorizer {
  // Explicitly disabled by the caller, regardless of env.
  process.env.FORCE_COLOR = "1";
  return new Colorizer(false);
}

describe("Colorizer: enable detection (supportsColor)", () => {
  it("FORCE_COLOR enables colors", () => {
    process.env.FORCE_COLOR = "1";
    const c = new Colorizer(true);
    expect(c.colorize("x", COLORS.red)).toBe(`${COLORS.red}x${COLORS.reset}`);
  });

  it("NO_COLOR disables colors even when requested", () => {
    process.env.NO_COLOR = "1";
    const c = new Colorizer(true);
    expect(c.colorize("x", COLORS.red)).toBe("x");
  });

  it("TERM=dumb disables colors", () => {
    process.env.TERM = "dumb";
    const c = new Colorizer(true);
    expect(c.colorize("x", COLORS.red)).toBe("x");
  });

  it("passing enabled=false short-circuits even with FORCE_COLOR", () => {
    process.env.FORCE_COLOR = "1";
    const c = new Colorizer(false);
    expect(c.colorize("x", COLORS.red)).toBe("x");
  });

  it("NO_COLOR takes precedence over FORCE_COLOR", () => {
    process.env.NO_COLOR = "1";
    process.env.FORCE_COLOR = "1";
    const c = new Colorizer(true);
    expect(c.colorize("x", COLORS.red)).toBe("x");
  });
});

describe("Colorizer: colorize / bold / dim", () => {
  it("wraps text in color + reset when enabled", () => {
    const c = colorOn();
    expect(c.colorize("hello", COLORS.green)).toBe(`${COLORS.green}hello${COLORS.reset}`);
    expect(c.bold("b")).toBe(`${COLORS.bold}b${COLORS.reset}`);
    expect(c.dim("d")).toBe(`${COLORS.dim}d${COLORS.reset}`);
  });

  it("returns text unchanged when disabled", () => {
    const c = colorOff();
    expect(c.colorize("hello", COLORS.green)).toBe("hello");
    expect(c.bold("b")).toBe("b");
    expect(c.dim("d")).toBe("d");
  });
});

describe("Colorizer: timestamp", () => {
  it("dims the timestamp when enabled", () => {
    const c = colorOn();
    expect(c.timestamp("2020-01-01")).toBe(`${COLORS.dim}2020-01-01${COLORS.reset}`);
  });

  it("returns plain timestamp when disabled", () => {
    expect(colorOff().timestamp("2020-01-01")).toBe("2020-01-01");
  });
});

describe("Colorizer: level badge + padded label", () => {
  it("renders badge and 5-char padded label colored per level", () => {
    const c = colorOn();
    const style = LEVEL_STYLES.info;
    const expectedBadge = `${style.color}${style.badge}${COLORS.reset}`;
    const expectedLabel = `${style.color}${style.label.padEnd(5)}${COLORS.reset}`;
    expect(c.level("info")).toBe(`${expectedBadge} ${expectedLabel}`);
  });

  it("pads short labels to width 5 when disabled (no color codes)", () => {
    const c = colorOff();
    // info label is "INFO " (already 5), debug is "DEBUG" (5)
    expect(c.level("info")).toBe(`${LEVEL_STYLES.info.badge} ${"INFO ".padEnd(5)}`);
    expect(c.level("debug")).toBe(`${LEVEL_STYLES.debug.badge} ${"DEBUG".padEnd(5)}`);
  });

  it("WAITING label exceeds 5 chars so padEnd is a no-op", () => {
    const c = colorOff();
    expect(c.level("waiting")).toBe(`${LEVEL_STYLES.waiting.badge} WAITING`);
  });
});

describe("Colorizer: message colors per level", () => {
  it("colors error/fatal red", () => {
    const c = colorOn();
    expect(c.message("boom", "error")).toBe(`${COLORS.red}boom${COLORS.reset}`);
    expect(c.message("boom", "fatal")).toBe(`${COLORS.red}boom${COLORS.reset}`);
  });

  it("colors warn yellow, success green, cached cyan, skip dim", () => {
    const c = colorOn();
    expect(c.message("m", "warn")).toBe(`${COLORS.yellow}m${COLORS.reset}`);
    expect(c.message("m", "success")).toBe(`${COLORS.green}m${COLORS.reset}`);
    expect(c.message("m", "cached")).toBe(`${COLORS.cyan}m${COLORS.reset}`);
    expect(c.message("m", "skip")).toBe(`${COLORS.dim}m${COLORS.reset}`);
  });

  it("leaves info/debug/progress/waiting messages uncolored even when enabled", () => {
    const c = colorOn();
    expect(c.message("m", "info")).toBe("m");
    expect(c.message("m", "debug")).toBe("m");
    expect(c.message("m", "progress")).toBe("m");
    expect(c.message("m", "waiting")).toBe("m");
  });

  it("returns the raw message when disabled regardless of level", () => {
    const c = colorOff();
    expect(c.message("boom", "error")).toBe("boom");
    expect(c.message("m", "warn")).toBe("m");
  });
});

describe("Colorizer: context", () => {
  it("returns empty string for empty context", () => {
    expect(colorOn().context({})).toBe("");
    expect(colorOff().context({})).toBe("");
  });

  it("dims the JSON-serialized context when enabled", () => {
    const c = colorOn();
    expect(c.context({ a: 1 })).toBe(`${COLORS.dim}{"a":1}${COLORS.reset}`);
  });

  it("returns plain JSON when disabled", () => {
    expect(colorOff().context({ a: 1, b: "x" })).toBe('{"a":1,"b":"x"}');
  });
});

describe("Colorizer: errorInfo", () => {
  it("includes name, message and stack, dimming the stack when enabled", () => {
    const c = colorOn();
    const out = c.errorInfo({ name: "TypeError", message: "bad", stack: "at foo" });
    expect(out).toBe(
      `\n${COLORS.red + COLORS.bold}TypeError${COLORS.reset}: ${COLORS.red}bad${COLORS.reset}` +
        `\n${COLORS.dim}at foo${COLORS.reset}`,
    );
  });

  it("omits the stack line when stack is undefined", () => {
    const c = colorOff();
    const out = c.errorInfo({ name: "Error", message: "oops", stack: undefined });
    expect(out).toBe("\nError: oops");
    expect(out).not.toContain("\n  ");
  });
});

describe("Colorizer: prefix", () => {
  it("wraps the prefix in brackets and magenta when enabled", () => {
    const c = colorOn();
    expect(c.prefix("api")).toBe(`${COLORS.magenta}[api]${COLORS.reset}`);
  });

  it("returns bracketed prefix without color when disabled", () => {
    expect(colorOff().prefix("api")).toBe("[api]");
  });
});
