import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createRuntime } from "../runtime";
import type { CliLogger, CliOutput } from "../types";

const logger: CliLogger = {
  debug: () => {},
  info: () => {},
  success: () => {},
  skip: () => {},
  warn: () => {},
  error: () => {},
};

const output: CliOutput = { write: () => {} };

describe("createRuntime", () => {
  afterEach(() => {
    spyOn(console, "debug").mockRestore();
    spyOn(console, "log").mockRestore();
    spyOn(console, "warn").mockRestore();
    spyOn(console, "error").mockRestore();
  });

  test("uses every caller-provided runtime value", () => {
    const runtime = createRuntime({
      args: ["build"],
      cwd: "/workspace",
      env: { MODE: "test" },
      logger,
      output,
    });

    expect(runtime.args).toEqual(["build"]);
    expect(runtime.cwd).toBe("/workspace");
    expect(runtime.env.MODE).toBe("test");
    expect(runtime.logger).toBe(logger);
    expect(runtime.output).toBe(output);
  });

  test("provides dependency-free logger and output defaults", () => {
    const debug = spyOn(console, "debug").mockImplementation(() => {});
    const log = spyOn(console, "log").mockImplementation(() => {});
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const error = spyOn(console, "error").mockImplementation(() => {});
    const runtime = createRuntime();

    runtime.logger.debug("debug");
    runtime.logger.info("info");
    runtime.logger.success("success");
    runtime.logger.skip("skip");
    runtime.logger.warn("warn");
    runtime.logger.error("error");
    runtime.output.write("output");

    expect(debug).toHaveBeenCalledWith("debug");
    expect(log).toHaveBeenCalledTimes(4);
    expect(warn).toHaveBeenCalledWith("warn");
    expect(error).toHaveBeenCalledWith("error");
  });
});
