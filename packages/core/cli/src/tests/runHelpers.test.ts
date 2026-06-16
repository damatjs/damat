import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { buildOptionFlag } from "../run/buildOption";
import { resolveCommandName } from "../run/resolveCommand";
import { buildCommandContext, extractPositionalArgs } from "../run/buildCommand";
import { Logger } from "@damatjs/logger";
import type { CliConfig } from "../types";

describe("buildOptionFlag", () => {
  test("renders a long flag only when there is no alias", () => {
    expect(buildOptionFlag({ name: "output" })).toBe("--output");
  });

  test("renders 'short, long' when an alias is provided", () => {
    expect(buildOptionFlag({ name: "output", alias: "o" })).toBe("-o, --output");
  });

  test("treats an empty-string alias as falsy and uses the long flag only", () => {
    expect(buildOptionFlag({ name: "force", alias: "" })).toBe("--force");
  });
});

describe("resolveCommandName", () => {
  test("returns null for an empty argument list", () => {
    expect(resolveCommandName([])).toBeNull();
  });

  test("returns the first argument when it is a bare word", () => {
    expect(resolveCommandName(["build", "--out", "dist"])).toBe("build");
  });

  test("returns null when the first argument is a flag", () => {
    expect(resolveCommandName(["--help"])).toBeNull();
    expect(resolveCommandName(["-h", "build"])).toBeNull();
  });

  test("returns null when the first element is an empty string", () => {
    expect(resolveCommandName([""])).toBeNull();
  });
});

describe("extractPositionalArgs", () => {
  test("keeps bare positional arguments", () => {
    expect(extractPositionalArgs(["build", "target", "other"])).toEqual([
      "build",
      "target",
      "other",
    ]);
  });

  test("skips a flag and the value immediately following it", () => {
    // The implementation skips the flag AND the next token (treated as its value).
    expect(extractPositionalArgs(["build", "--out", "dist"])).toEqual(["build"]);
  });

  test("skips short flags and consumes their following value too", () => {
    expect(extractPositionalArgs(["-o", "dist", "keep"])).toEqual(["keep"]);
  });

  test("returns an empty array for an empty input", () => {
    expect(extractPositionalArgs([])).toEqual([]);
  });

  test("ignores empty-string entries", () => {
    expect(extractPositionalArgs(["", "a", ""])).toEqual(["a"]);
  });

  test("a trailing flag with no value consumes the (nonexistent) next token", () => {
    expect(extractPositionalArgs(["cmd", "--flag"])).toEqual(["cmd"]);
  });
});

describe("buildCommandContext", () => {
  const originalArgv = process.argv;
  let logger: Logger;
  const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };

  beforeEach(() => {
    logger = new Logger({ timestamp: false });
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  test("populates command, options, logger and cwd", () => {
    process.argv = ["node", "mycli", "build"];
    const opts = { out: "dist" };
    const ctx = buildCommandContext("build", opts, logger, config);

    expect(ctx.command).toBe("build");
    expect(ctx.options).toBe(opts);
    expect(ctx.logger).toBe(logger);
    expect(ctx.cwd).toBe(process.cwd());
  });

  test("derives positional args from process.argv, excluding the command name", () => {
    // argv after slice(2) -> ["build", "target"], filter out the command name -> ["target"]
    process.argv = ["node", "mycli", "build", "target"];
    const ctx = buildCommandContext("build", {}, logger, config);
    expect(ctx.args).toEqual(["target"]);
  });

  test("excludes flags (and their values) from the positional args", () => {
    process.argv = ["node", "mycli", "build", "target", "--out", "dist"];
    const ctx = buildCommandContext("build", {}, logger, config);
    expect(ctx.args).toEqual(["target"]);
  });

  test("returns no positional args when only the command name is present", () => {
    process.argv = ["node", "mycli", "build"];
    const ctx = buildCommandContext("build", {}, logger, config);
    expect(ctx.args).toEqual([]);
  });
});
