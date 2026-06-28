import { describe, it, expect } from "bun:test";
import { logger } from "../logger/index";

// The logger module configures a winston logger with a single Console transport
// whose printf format returns `log.message`. The 0% function coverage comes from
// that printf callback never being invoked. We exercise it directly via the
// transport's format so nothing is written to the real console transport stream
// in a way that pollutes test output (winston buffers via the format pipeline).

describe("logger (winston configuration)", () => {
  it("should be a configured winston logger instance", () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
  });

  it("should register exactly one Console transport", () => {
    expect(logger.transports).toHaveLength(1);
  });

  it("should format a log entry to its raw message via the printf callback", () => {
    const transport = logger.transports[0]!;
    const format = (transport as any).format;
    // winston format.transform({ message, level }, opts) runs the printf fn.
    const info: any = { level: "info", message: "hello-world" };
    const transformed = format.transform(info, {});
    // printf returns log.message, which winston places on the Symbol.for("message")
    const MESSAGE = Symbol.for("message");
    expect((transformed as any)[MESSAGE]).toBe("hello-world");
  });
});
