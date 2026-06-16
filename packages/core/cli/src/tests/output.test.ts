import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  formatCommandHelp,
  printError,
  printInfo,
  printSection,
  printSuccess,
} from "../utils/output";
import type { ILogger } from "@damatjs/logger";

/**
 * Minimal ILogger stub that records calls. The output helpers only ever use
 * error/info/success, but we implement the whole surface so it satisfies the
 * ILogger type and never accidentally hits a real console.
 */
function createLoggerSpy() {
  const calls: Record<string, unknown[][]> = {
    error: [],
    info: [],
    success: [],
    warn: [],
    debug: [],
  };
  const record = (name: string) => (...args: unknown[]) => {
    calls[name]!.push(args);
  };
  const logger = {
    debug: record("debug"),
    info: record("info"),
    waiting: record("waiting"),
    progress: record("progress"),
    cached: record("cached"),
    success: record("success"),
    warn: record("warn"),
    error: record("error"),
    fatal: record("fatal"),
    skip: record("skip"),
    child: () => logger,
    withPrefix: () => logger,
    request: () => {},
  } as unknown as ILogger;
  return { logger, calls };
}

describe("formatCommandHelp", () => {
  test("pads the name to 20 chars and appends the description", () => {
    const result = formatCommandHelp("build", "Build the project");
    expect(result).toBe("build".padEnd(20) + "Build the project");
  });

  test("does not include a usage line when usage is omitted", () => {
    const result = formatCommandHelp("build", "Build the project");
    expect(result).not.toContain("Usage:");
    expect(result.split("\n")).toHaveLength(1);
  });

  test("appends an indented usage line when usage is provided", () => {
    const result = formatCommandHelp("build", "Build the project", "cli build [opts]");
    const lines = result.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(" ".repeat(20) + "Usage: cli build [opts]");
  });

  test("does not truncate names longer than the pad width", () => {
    const longName = "a-very-long-command-name-exceeding-twenty";
    const result = formatCommandHelp(longName, "desc");
    expect(result).toBe(longName + "desc");
  });
});

describe("printError", () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("logs the message through logger.error and surrounds it with blank lines", () => {
    const { logger, calls } = createLoggerSpy();
    printError(logger, "something broke");

    expect(calls.error).toHaveLength(1);
    expect(calls.error[0]?.[0]).toBe("something broke");
    // Without a suggestion: one blank line before, one after => 2 console.log calls.
    expect(consoleOutput).toEqual(["", ""]);
  });

  test("prints the suggestion between additional blank lines when provided", () => {
    const { logger, calls } = createLoggerSpy();
    printError(logger, "boom", "try --help");

    expect(calls.error).toHaveLength(1);
    // blank, blank, suggestion, blank
    expect(consoleOutput).toEqual(["", "", "try --help", ""]);
  });

  test("does not call any other logger level", () => {
    const { logger, calls } = createLoggerSpy();
    printError(logger, "x");
    expect(calls.info).toHaveLength(0);
    expect(calls.success).toHaveLength(0);
    expect(calls.warn).toHaveLength(0);
  });
});

describe("printInfo", () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("logs message via logger.info with surrounding blank lines", () => {
    const { logger, calls } = createLoggerSpy();
    printInfo(logger, "heads up");

    expect(calls.info).toHaveLength(1);
    expect(calls.info[0]?.[0]).toBe("heads up");
    expect(consoleOutput).toEqual(["", ""]);
  });

  test("prints details (without an extra blank line before) when provided", () => {
    const { logger } = createLoggerSpy();
    printInfo(logger, "heads up", "more detail");
    // blank, details, blank
    expect(consoleOutput).toEqual(["", "more detail", ""]);
  });
});

describe("printSuccess", () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("logs via logger.success with surrounding blank lines", () => {
    const { logger, calls } = createLoggerSpy();
    printSuccess(logger, "done");

    expect(calls.success).toHaveLength(1);
    expect(calls.success[0]?.[0]).toBe("done");
    expect(consoleOutput).toEqual(["", ""]);
  });

  test("prints details when provided", () => {
    const { logger } = createLoggerSpy();
    printSuccess(logger, "done", "details here");
    expect(consoleOutput).toEqual(["", "details here", ""]);
  });
});

describe("printSection", () => {
  let consoleOutput: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test("prints a titled header followed by indented content lines", () => {
    printSection("Commands", ["build  Build it", "test  Run it"]);

    expect(consoleOutput).toEqual([
      "\nCommands:",
      "  build  Build it",
      "  test  Run it",
    ]);
  });

  test("prints only the header for empty content", () => {
    printSection("Empty", []);
    expect(consoleOutput).toEqual(["\nEmpty:"]);
  });

  test("indents every content line with two spaces", () => {
    printSection("X", ["one"]);
    expect(consoleOutput[1]).toBe("  one");
  });
});
