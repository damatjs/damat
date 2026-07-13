import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import {
  createLogger,
  setGlobalLogger,
  getLogger,
  clearGlobalLogger,
  closeLogger,
  isLoggerConfigured,
  createContextLogger,
  debug,
  info,
  progress,
  cached,
  waiting,
  warn,
  error,
  fatal,
} from "../global";
import { Logger } from "../logger";
import { ChildLogger } from "../child";
import { NoopLogger } from "../noop";

/**
 * The global module holds a module-level singleton. We reset it before AND
 * after every test (clearGlobalLogger) to guarantee isolation, and we capture
 * console output for the convenience functions so nothing reaches real stdout.
 */
let logSpy: ReturnType<typeof spyOn>;
let warnSpy: ReturnType<typeof spyOn>;
let errorSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  clearGlobalLogger();
  logSpy = spyOn(console, "log").mockImplementation(() => {});
  warnSpy = spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
  clearGlobalLogger();
});

describe("global: configured state", () => {
  it("starts unconfigured after a reset", () => {
    expect(isLoggerConfigured()).toBe(false);
  });

  it("getLogger lazily creates and registers a singleton", () => {
    expect(isLoggerConfigured()).toBe(false);
    const l = getLogger();
    expect(l).toBeInstanceOf(Logger);
    expect(isLoggerConfigured()).toBe(true);
    // Subsequent calls return the same instance.
    expect(getLogger()).toBe(l);
  });

  it("clearGlobalLogger resets the singleton", () => {
    getLogger();
    expect(isLoggerConfigured()).toBe(true);
    clearGlobalLogger();
    expect(isLoggerConfigured()).toBe(false);
    // A new getLogger creates a fresh instance.
    const fresh = getLogger();
    expect(fresh).toBeInstanceOf(Logger);
  });
});

describe("global: createLogger / setGlobalLogger", () => {
  it("createLogger builds a Logger and installs it as the global", () => {
    const l = createLogger({ timestamp: false, level: "debug" });
    expect(l).toBeInstanceOf(Logger);
    expect(getLogger()).toBe(l);
    expect(isLoggerConfigured()).toBe(true);
  });

  it("setGlobalLogger swaps in a provided instance", () => {
    const custom = new Logger({ timestamp: false });
    setGlobalLogger(custom);
    expect(getLogger()).toBe(custom);
  });
});

describe("global: closeLogger", () => {
  it("closes and clears the singleton", () => {
    const l = createLogger({ timestamp: false });
    const closeSpy = spyOn(l, "close");
    closeLogger();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(isLoggerConfigured()).toBe(false);
  });

  it("is a no-op when no global logger is set", () => {
    expect(() => closeLogger()).not.toThrow();
    expect(isLoggerConfigured()).toBe(false);
  });
});

describe("global: createContextLogger", () => {
  it("returns a ChildLogger of the global when one is configured", () => {
    createLogger({ timestamp: false, level: "debug" });
    const ctxLogger = createContextLogger({ rid: "1" });
    expect(ctxLogger).toBeInstanceOf(ChildLogger);
  });

  it("falls back to a NoopLogger child when no global logger exists", () => {
    expect(isLoggerConfigured()).toBe(false);
    const ctxLogger = createContextLogger({ rid: "1" });
    expect(ctxLogger).toBeInstanceOf(NoopLogger);
    // Calling it does not touch console.
    ctxLogger.info("ignored");
    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe("global: convenience functions route through getLogger", () => {
  it("debug/info/progress/cached/waiting go to console.log when level=debug", () => {
    createLogger({ timestamp: false, level: "debug" });
    debug("d");
    info("i");
    progress("p");
    cached("c");
    waiting("w");
    const out = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    for (const m of ["d", "i", "p", "c", "w"]) expect(out).toContain(m);
  });

  it("warn goes to console.warn", () => {
    createLogger({ timestamp: false, level: "debug" });
    warn("careful");
    expect(warnSpy.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      "careful",
    );
  });

  it("error and fatal go to console.error and accept an error argument", () => {
    createLogger({ timestamp: false, level: "debug" });
    error("boom", new Error("e1"));
    fatal("dead", new Error("e2"));
    const out = errorSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain("boom");
    expect(out).toContain("Error: e1");
    expect(out).toContain("dead");
    expect(out).toContain("Error: e2");
  });

  it("convenience functions lazily create a global logger if none exists", () => {
    expect(isLoggerConfigured()).toBe(false);
    info("auto");
    expect(isLoggerConfigured()).toBe(true);
  });
});
