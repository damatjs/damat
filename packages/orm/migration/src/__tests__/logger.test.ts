import { describe, it, expect, spyOn, afterEach } from "bun:test";
import { log, separator, successBanner, errorBanner } from "../logger";

/**
 * The migration `log()` wrapper concatenates message + details and dispatches
 * to a @damatjs/logger Logger, which writes to the console:
 *   - error  → console.error
 *   - warn   → console.warn
 *   - others → console.log
 * We spy on the console methods and assert routing + that the message text
 * (which the formatter embeds) reaches the right channel.
 */

let spies: ReturnType<typeof spyOn>[] = [];

function spyConsole() {
  const logSpy = spyOn(console, "log").mockImplementation(() => {});
  const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = spyOn(console, "error").mockImplementation(() => {});
  spies = [logSpy, warnSpy, errorSpy];
  return { logSpy, warnSpy, errorSpy };
}

afterEach(() => {
  for (const s of spies) s.mockRestore();
  spies = [];
});

const joinCalls = (spy: ReturnType<typeof spyOn>) =>
  spy.mock.calls.map((c: unknown[]) => c.join(" ")).join("\n");

describe("log()", () => {
  it("routes info to console.log and includes the message", () => {
    const { logSpy, warnSpy, errorSpy } = spyConsole();
    log("info", "running migrations");
    expect(logSpy).toHaveBeenCalled();
    expect(joinCalls(logSpy)).toContain("running migrations");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("routes success and skip to console.log", () => {
    const { logSpy } = spyConsole();
    log("success", "applied migration");
    log("skip", "no pending migrations");
    const out = joinCalls(logSpy);
    expect(out).toContain("applied migration");
    expect(out).toContain("no pending migrations");
  });

  it("routes warn to console.warn", () => {
    const { warnSpy, logSpy, errorSpy } = spyConsole();
    log("warn", "destructive change");
    expect(warnSpy).toHaveBeenCalled();
    expect(joinCalls(warnSpy)).toContain("destructive change");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("routes error to console.error", () => {
    const { errorSpy, logSpy, warnSpy } = spyConsole();
    log("error", "migration failed");
    expect(errorSpy).toHaveBeenCalled();
    expect(joinCalls(errorSpy)).toContain("migration failed");
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("appends the optional details after the message", () => {
    const { logSpy } = spyConsole();
    log("success", "Applied: Migration1_Initial", "(150ms)");
    const out = joinCalls(logSpy);
    expect(out).toContain("Applied: Migration1_Initial");
    expect(out).toContain("(150ms)");
  });

  it("omits the details segment when none is provided", () => {
    const { logSpy } = spyConsole();
    log("info", "solo-message");
    // The single emitted message must not contain a stray trailing 'undefined'.
    expect(joinCalls(logSpy)).not.toContain("undefined");
  });
});

describe("re-exported logger banners/separators", () => {
  it("exposes separator, successBanner and errorBanner as functions", () => {
    expect(typeof separator).toBe("function");
    expect(typeof successBanner).toBe("function");
    expect(typeof errorBanner).toBe("function");
  });

  it("separator produces output without throwing", () => {
    const { logSpy } = spyConsole();
    // These banners print to the console; just assert they run cleanly.
    expect(() => separator()).not.toThrow();
    // Restore happens in afterEach; touching logSpy keeps it referenced.
    void logSpy;
  });
});
