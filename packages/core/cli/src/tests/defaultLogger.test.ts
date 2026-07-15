import { describe, expect, spyOn, test } from "bun:test";
import { createDefaultLogger } from "../runtime";

describe("DefaultCliLogger", () => {
  test("forwards structured context at every standard level", () => {
    const debug = spyOn(console, "debug").mockImplementation(() => {});
    const log = spyOn(console, "log").mockImplementation(() => {});
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const context = { requestId: "req_1" };
    const logger = createDefaultLogger();

    logger.debug("debug", context);
    logger.info("info", context);
    logger.success("success", context);
    logger.skip("skip", context);
    logger.warn("warn", context);

    expect(debug).toHaveBeenCalledWith("debug", context);
    expect(log).toHaveBeenNthCalledWith(1, "info", context);
    expect(log).toHaveBeenNthCalledWith(2, "success", context);
    expect(log).toHaveBeenNthCalledWith(3, "skip", context);
    expect(warn).toHaveBeenCalledWith("warn", context);

    debug.mockRestore();
    log.mockRestore();
    warn.mockRestore();
  });

  test("forwards error and context only when provided", () => {
    const output = spyOn(console, "error").mockImplementation(() => {});
    const logger = createDefaultLogger();
    const error = new Error("boom");
    const context = { command: "build" };

    logger.error("plain");
    logger.error("detailed", error, context);

    expect(output).toHaveBeenNthCalledWith(1, "plain");
    expect(output).toHaveBeenNthCalledWith(
      2,
      "detailed",
      error,
      context,
    );
    output.mockRestore();
  });
});
