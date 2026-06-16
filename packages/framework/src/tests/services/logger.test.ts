import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  initLogger,
  getLogger,
  setGlobalLoggerInstance,
  clearGlobalLogger,
  closeLogger,
  isLoggerConfigured,
  createContextLogger,
} from "../../services/logger";

// The logger module keeps a module-level singleton. Reset it before and after
// every test so the suite is order-independent and each test exercises a known
// starting state.
beforeEach(() => {
  clearGlobalLogger();
});

afterEach(() => {
  clearGlobalLogger();
});

describe("Logger Service", () => {
  describe("initLogger", () => {
    it("creates a logger with default config", () => {
      const logger = initLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.debug).toBe("function");
    });

    it("returns the same logger on subsequent calls (singleton)", () => {
      const logger1 = initLogger();
      const logger2 = initLogger();
      expect(logger1).toBe(logger2);
    });

    it("ignores config on the second call once already initialized", () => {
      const first = initLogger({ level: "info", format: "pretty" });
      const second = initLogger({ level: "debug", format: "json" });
      // The implementation short-circuits when a logger already exists, so the
      // second config is not applied and the original instance is returned.
      expect(second).toBe(first);
    });

    it("creates logger with custom config when uninitialized", () => {
      const logger = initLogger({ level: "debug", format: "json" });
      expect(logger).toBeDefined();
    });
  });

  describe("getLogger", () => {
    it("auto-initializes a logger when none exists", () => {
      // Current behavior: getLogger() lazily initializes rather than throwing.
      expect(isLoggerConfigured()).toBe(false);
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(isLoggerConfigured()).toBe(true);
    });

    it("returns the already-initialized instance", () => {
      const created = initLogger();
      expect(getLogger()).toBe(created);
    });

    it("auto-initializes again after the global instance is cleared", () => {
      const first = getLogger();
      clearGlobalLogger();
      expect(isLoggerConfigured()).toBe(false);
      const second = getLogger();
      expect(second).toBeDefined();
      // A fresh instance is produced after a reset.
      expect(second).not.toBe(first);
    });
  });

  describe("setGlobalLoggerInstance", () => {
    it("replaces the active logger instance", () => {
      const replacement = initLogger();
      clearGlobalLogger();
      setGlobalLoggerInstance(replacement);
      expect(getLogger()).toBe(replacement);
      expect(isLoggerConfigured()).toBe(true);
    });
  });

  describe("isLoggerConfigured", () => {
    it("reports false before init and true after", () => {
      expect(isLoggerConfigured()).toBe(false);
      initLogger();
      expect(isLoggerConfigured()).toBe(true);
    });
  });

  describe("clearGlobalLogger", () => {
    it("resets configured state to false", () => {
      initLogger();
      expect(isLoggerConfigured()).toBe(true);
      clearGlobalLogger();
      expect(isLoggerConfigured()).toBe(false);
    });
  });

  describe("closeLogger", () => {
    it("closes and clears the logger", () => {
      initLogger();
      expect(isLoggerConfigured()).toBe(true);
      closeLogger();
      expect(isLoggerConfigured()).toBe(false);
    });

    it("is a no-op when no logger is configured", () => {
      expect(isLoggerConfigured()).toBe(false);
      expect(() => closeLogger()).not.toThrow();
      expect(isLoggerConfigured()).toBe(false);
    });
  });

  describe("createContextLogger", () => {
    it("returns a child logger from the global instance when configured", () => {
      initLogger();
      const child = createContextLogger({ requestId: "abc-123" });
      expect(child).toBeDefined();
      expect(typeof child.info).toBe("function");
    });

    it("falls back to a NOOP child logger when uninitialized", () => {
      expect(isLoggerConfigured()).toBe(false);
      const child = createContextLogger({ requestId: "noop" });
      expect(child).toBeDefined();
      expect(typeof child.info).toBe("function");
      // Using the noop logger must not throw and must not configure the global.
      expect(() => child.info("hello")).not.toThrow();
      expect(isLoggerConfigured()).toBe(false);
    });
  });
});
