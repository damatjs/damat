import { describe, test, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { Logger } from "@damatjs/logger";
import { CliError } from "../errors";
import { reportError, getExitCode, isVerbose } from "../utils/output";

describe("reportError", () => {
  let logger: Logger;
  let errorSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logger = new Logger({ timestamp: false });
    errorSpy = spyOn(logger, "error").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.DAMAT_DEBUG;
  });

  test("non-verbose: prints a clean headline, no stack, and a --verbose hint", () => {
    reportError(logger, new Error("boom"), {
      prefix: "Command failed",
      verbose: false,
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toBe("Command failed: boom");
    // No Error object passed -> the logger does not print a stack.
    expect(errorSpy.mock.calls[0]?.[1]).toBeUndefined();
    // A hint pointing at --verbose is printed.
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]?.[0]).toContain("--verbose");
  });

  test("verbose: passes the error to the logger (stack) and prints no hint", () => {
    const err = new Error("boom");
    reportError(logger, err, { prefix: "Command failed", verbose: true });

    expect(errorSpy.mock.calls[0]?.[0]).toBe("Command failed: boom");
    // The Error itself is forwarded so the logger renders the stack trace.
    expect(errorSpy.mock.calls[0]?.[1]).toBe(err);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("surfaces a meaningful error type name in the headline", () => {
    class ConfigError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "ConfigError";
      }
    }
    reportError(logger, new ConfigError("bad config"), { verbose: false });
    expect(errorSpy.mock.calls[0]?.[0]).toBe("ConfigError: bad config");
  });

  test("omits the generic 'Error' name from the headline", () => {
    reportError(logger, new Error("plain"), { verbose: false });
    expect(errorSpy.mock.calls[0]?.[0]).toBe("plain");
  });

  test("walks the cause chain", () => {
    const root = new Error("root cause");
    const top = new Error("top");
    (top as Error & { cause?: unknown }).cause = root;

    reportError(logger, top, { verbose: false });

    const messages = errorSpy.mock.calls.map((c) => c[0]);
    expect(messages[0]).toBe("top");
    expect(messages[1]).toBe("↳ caused by: root cause");
  });

  test("handles non-Error thrown values", () => {
    reportError(logger, "a plain string", { verbose: false });
    expect(errorSpy.mock.calls[0]?.[0]).toBe("a plain string");
  });
});

describe("getExitCode", () => {
  test("honors CliError.exitCode", () => {
    expect(getExitCode(new CliError("x", 2))).toBe(2);
  });

  test("defaults to 1 for plain errors and non-error values", () => {
    expect(getExitCode(new Error("x"))).toBe(1);
    expect(getExitCode("x")).toBe(1);
    expect(getExitCode(undefined)).toBe(1);
  });
});

describe("isVerbose", () => {
  afterEach(() => {
    delete process.env.DAMAT_DEBUG;
  });

  test("respects an explicit override", () => {
    expect(isVerbose(true)).toBe(true);
    expect(isVerbose(false)).toBe(false);
  });

  test("auto-detects DAMAT_DEBUG when no override is given", () => {
    delete process.env.DAMAT_DEBUG;
    // Baseline reflects whatever the test runner's argv is (normally no flag).
    const baseline = process.argv.includes("--verbose");
    expect(isVerbose()).toBe(baseline);

    process.env.DAMAT_DEBUG = "1";
    expect(isVerbose()).toBe(true);
  });
});
