import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { separator, successBanner, errorBanner } from "../utils";
import { COLORS } from "../colors";

/**
 * The utils write straight to console.log with raw COLORS codes (no Colorizer,
 * so colors are unconditional). We spy on console.log to capture exact output.
 */
let logSpy: ReturnType<typeof spyOn>;

afterEach(() => {
  logSpy?.mockRestore();
});

function spyLog() {
  logSpy = spyOn(console, "log").mockImplementation(() => {});
  return logSpy;
}

describe("utils.separator", () => {
  it("prints a 50-char box-drawing line by default", () => {
    const spy = spyLog();
    separator();
    expect(spy).toHaveBeenCalledTimes(1);
    const line = String(spy.mock.calls[0][0]);
    expect(line).toBe("─".repeat(50));
    expect(line.length).toBe(50);
  });

  it("honors a custom length", () => {
    const spy = spyLog();
    separator(8);
    expect(String(spy.mock.calls[0][0])).toBe("─".repeat(8));
  });

  it("length 0 prints an empty line", () => {
    const spy = spyLog();
    separator(0);
    expect(String(spy.mock.calls[0][0])).toBe("");
  });

  it("length 1 prints a single character", () => {
    const spy = spyLog();
    separator(1);
    expect(String(spy.mock.calls[0][0])).toBe("─");
  });
});

describe("utils.successBanner", () => {
  it("prints separator, green-checked message, separator (3 log calls)", () => {
    const spy = spyLog();
    successBanner("All good");
    expect(spy).toHaveBeenCalledTimes(3);
    const [top, mid, bottom] = spy.mock.calls.map((c) => String(c[0]));
    expect(top).toBe("─".repeat(50));
    expect(bottom).toBe("─".repeat(50));
    expect(mid).toBe(`${COLORS.green}✓ All good${COLORS.reset}`);
  });
});

describe("utils.errorBanner", () => {
  it("prints separator, red-crossed message, separator (3 log calls)", () => {
    const spy = spyLog();
    errorBanner("It broke");
    expect(spy).toHaveBeenCalledTimes(3);
    const [top, mid, bottom] = spy.mock.calls.map((c) => String(c[0]));
    expect(top).toBe("─".repeat(50));
    expect(bottom).toBe("─".repeat(50));
    expect(mid).toBe(`${COLORS.red}✗ It broke${COLORS.reset}`);
  });

  it("handles empty messages", () => {
    const spy = spyLog();
    errorBanner("");
    expect(String(spy.mock.calls[1][0])).toBe(`${COLORS.red}✗ ${COLORS.reset}`);
  });
});
