import { describe, it, expect } from "bun:test";
import { initLogger, getLogger, setGlobalLoggerInstance } from "../../services/logger";

describe("Logger Service", () => {
  it("creates a logger with default config", () => {
    const logger = initLogger();
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.debug).toBeDefined();
  });

  it("returns the same logger on subsequent calls", () => {
    const logger1 = initLogger();
    const logger2 = initLogger();
    expect(logger1).toBe(logger2);
  });

  it("creates logger with custom config", () => {
    const logger = initLogger({ level: "debug", format: "json" });
    expect(logger).toBeDefined();
  });

  it("throws when logger not initialized after reset", () => {
    setGlobalLoggerInstance(null as never);
    expect(() => getLogger()).toThrow("Logger not initialized. Call initLogger() first.");
    initLogger();
  });
});
