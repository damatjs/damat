import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import fs, { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { cac } from "cac";
import { Logger } from "@damatjs/logger";
import { registerSingleCommand } from "../run/registerCommand";
import { clearConfigCache } from "../config";
import type { CliConfig, Command, CommandContext } from "../types";

/**
 * process.exit is stubbed to RECORD every requested exit code and then throw a
 * sentinel so the action halts (the real exit never returns either). Because
 * registerSingleCommand calls process.exit at the end of its try block on the
 * success path, that throw would be caught by its own catch (which calls exit
 * again). We therefore always assert on the FIRST recorded code, which is the
 * real outcome the production process would have exited with.
 */
class ExitSignal extends Error {
  constructor(public code: number) {
    super(`__exit__:${code}`);
  }
}

const exitCodes: number[] = [];

function installExitSpy() {
  exitCodes.length = 0;
  return spyOn(process, "exit").mockImplementation(((code?: number) => {
    exitCodes.push(code ?? 0);
    throw new ExitSignal(code ?? 0);
  }) as never);
}

function firstExitCode(): number | "no-exit" {
  return exitCodes.length > 0 ? exitCodes[0]! : "no-exit";
}

/**
 * Match the argv with cac (without auto-running so async actions aren't fired
 * un-awaited), then invoke the matched command's action ourselves and await it.
 * Returns the FIRST exit code requested during the action.
 */
async function runAndCaptureExit(
  cli: ReturnType<typeof cac>,
  argv: string[]
): Promise<number | "no-exit"> {
  await invokeAction(cli, argv, undefined);
  return firstExitCode();
}

/** Invoke the matched command's action, swallowing the ExitSignal sentinel. */
async function invokeAction(
  cli: ReturnType<typeof cac>,
  argv: string[],
  options?: Record<string, unknown>
): Promise<void> {
  const parsed = cli.parse(["node", "cli", ...argv], { run: false }) as unknown as {
    options: Record<string, unknown>;
  };
  const matched = (cli as unknown as {
    matchedCommand?: { commandAction?: (o: Record<string, unknown>) => Promise<void> };
  }).matchedCommand;
  if (!matched?.commandAction) return;
  try {
    await matched.commandAction(options ?? parsed.options);
  } catch (err) {
    if (!(err instanceof ExitSignal)) throw err;
  }
}

describe("registerSingleCommand", () => {
  let exitSpy: ReturnType<typeof installExitSpy>;
  let logErrorSpy: ReturnType<typeof spyOn>;
  let logger: Logger;
  let baseConfig: CliConfig;

  beforeEach(() => {
    clearConfigCache();
    exitSpy = installExitSpy();
    logger = new Logger({ timestamp: false });
    logErrorSpy = spyOn(logger, "error").mockImplementation(() => {});
    spyOn(logger, "info").mockImplementation(() => {});
    spyOn(logger, "debug").mockImplementation(() => {});
    baseConfig = { name: "cli", version: "1.0.0", commands: [] };
  });

  afterEach(() => {
    exitSpy.mockRestore();
    clearConfigCache();
  });

  test("does not register a parent command that has subcommands (early return)", () => {
    const cli = cac("cli");
    const commandSpy = spyOn(cli, "command");
    const cmd: Command = {
      name: "db",
      description: "DB",
      subcommands: [
        { name: "db:up", description: "up", handler: async () => ({ exitCode: 0 }) },
      ],
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);
    expect(commandSpy).not.toHaveBeenCalled();
  });

  test("registers the command name, description, aliases and options on cac", () => {
    const cli = cac("cli");
    const cmd: Command = {
      name: "build",
      description: "Build it",
      aliases: ["b"],
      options: [{ name: "out", description: "Out dir", default: "dist" }],
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);

    const registered = cli.commands.find((c) => c.name === "build");
    expect(registered).toBeDefined();
    expect(registered?.description).toBe("Build it");
    expect(registered?.aliasNames).toContain("b");
    // The option flag was added.
    const optionNames = registered?.options.map((o) => o.rawName) ?? [];
    expect(optionNames.some((n) => n.includes("--out"))).toBe(true);
  });

  test("invokes the handler and exits with the handler's exit code", async () => {
    const cli = cac("cli");
    let received: CommandContext | null = null;
    const cmd: Command = {
      name: "ok",
      description: "ok",
      handler: async (ctx) => {
        received = ctx;
        return { exitCode: 0 };
      },
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);

    const code = await runAndCaptureExit(cli, ["ok"]);
    expect(code).toBe(0);
    expect(received).not.toBeNull();
    expect(received!.command).toBe("ok");
  });

  test("propagates a nonzero handler exit code", async () => {
    const cli = cac("cli");
    const cmd: Command = {
      name: "fail",
      description: "fail",
      handler: async () => ({ exitCode: 3 }),
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);

    const code = await runAndCaptureExit(cli, ["fail"]);
    expect(code).toBe(3);
  });

  test("logs an error and exits with the CliError exit code on validation failure", async () => {
    const cli = cac("cli");
    const cmd: Command = {
      name: "needs",
      description: "needs opt",
      options: [{ name: "name", description: "Name", required: true }],
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);

    const code = await runAndCaptureExit(cli, ["needs"]);
    expect(code).toBe(1);
    expect(logErrorSpy).toHaveBeenCalled();
    expect(logErrorSpy.mock.calls[0]?.[0]).toContain("Missing required option");
  });

  test("catches a thrown handler error, logs it, calls onError, and exits 1", async () => {
    const cli = cac("cli");
    let onErrorArgs: { error: Error; ctx: Partial<CommandContext> } | null = null;
    const config: CliConfig = {
      ...baseConfig,
      onError: (error, ctx) => {
        onErrorArgs = { error, ctx };
      },
    };
    const cmd: Command = {
      name: "boom",
      description: "boom",
      handler: async () => {
        throw new Error("kaboom");
      },
    };
    registerSingleCommand(cli, cmd, config, logger);

    const code = await runAndCaptureExit(cli, ["boom"]);
    expect(code).toBe(1);
    expect(logErrorSpy).toHaveBeenCalled();
    expect(logErrorSpy.mock.calls[0]?.[0]).toContain("Command failed: kaboom");
    expect(onErrorArgs).not.toBeNull();
    expect(onErrorArgs!.error).toBeInstanceOf(Error);
    expect(onErrorArgs!.error.message).toBe("kaboom");
  });

  test("logs and exits with the CliError exit code when validation throws a non-default code", async () => {
    // Drive the action directly so cac flag-parsing cannot supply the required
    // option; this guarantees validateOptions throws a CliError and we hit the
    // logger.error + process.exit(error.exitCode) branch.
    const cli = cac("cli");
    const cmd: Command = {
      name: "req",
      description: "req",
      options: [{ name: "token", description: "Token", required: true }],
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);

    await invokeAction(cli, ["req"], {});
    expect(firstExitCode()).toBe(1);
    expect(logErrorSpy).toHaveBeenCalled();
    expect(logErrorSpy.mock.calls[0]?.[0]).toContain("Missing required option");
  });

  test("attaches a successfully loaded project config onto ctx.options.config", async () => {
    const cli = cac("cli");
    let received: CommandContext | null = null;
    const loaded = { db: { url: "postgres://x" } };
    const config: CliConfig = {
      ...baseConfig,
      configLoader: {
        file: "ok.config.ts",
        load: async () => loaded,
      },
    };
    const cmd: Command = {
      name: "usescfg",
      description: "usescfg",
      handler: async (ctx) => {
        received = ctx;
        return { exitCode: 0 };
      },
    };
    registerSingleCommand(cli, cmd, config, logger);

    const dir = mkdtempSync(path.join(os.tmpdir(), "damat-cli-okcfg-"));
    fs.writeFileSync(path.join(dir, "ok.config.ts"), "export default {};");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await invokeAction(cli, ["usescfg"], {});
    } finally {
      process.chdir(cwd);
      fs.rmSync(dir, { recursive: true, force: true });
    }

    expect(received).not.toBeNull();
    expect(received!.options.config).toEqual(loaded);
  });

  test("reports and exits when loading the project config fails", async () => {
    const cli = cac("cli");
    const config: CliConfig = {
      ...baseConfig,
      configLoader: {
        file: "anything.config.ts",
        load: async () => {
          throw new Error("config blew up");
        },
      },
    };
    const cmd: Command = {
      name: "withcfg",
      description: "withcfg",
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, config, logger);

    // The loader's file must exist for loadConfig to attempt the load. Point it
    // at a real temp file and run from that dir so the relative path resolves.
    const dir = mkdtempSync(path.join(os.tmpdir(), "damat-cli-regcmd-"));
    const cfgPath = path.join(dir, "anything.config.ts");
    fs.writeFileSync(cfgPath, "export default {};");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      await invokeAction(cli, ["withcfg"], {});
    } finally {
      process.chdir(cwd);
      fs.rmSync(dir, { recursive: true, force: true });
    }

    expect(firstExitCode()).not.toBe("no-exit");
    expect(logErrorSpy).toHaveBeenCalled();
    expect(
      logErrorSpy.mock.calls.some((c: unknown[]) =>
        String(c[0]).includes("Failed to load configuration"),
      ),
    ).toBe(true);
  });

  test("emits the auto verbose info message when --verbose is set", async () => {
    const cli = cac("cli");
    const infoSpy = logger.info as unknown as ReturnType<typeof spyOn>;
    const cmd: Command = {
      name: "v",
      description: "v",
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, baseConfig, logger);

    // Drive the action directly with verbose enabled to avoid cac flag parsing quirks.
    await invokeAction(cli, ["v"], { verbose: true });
    expect(infoSpy).toHaveBeenCalledWith("Verbose mode enabled");
  });

  test("does not emit the auto verbose info message when handler is 'manual'", async () => {
    const cli = cac("cli");
    const infoSpy = logger.info as unknown as ReturnType<typeof spyOn>;
    const config: CliConfig = { ...baseConfig, verbose: { handler: "manual" } };
    const cmd: Command = {
      name: "v2",
      description: "v2",
      handler: async () => ({ exitCode: 0 }),
    };
    registerSingleCommand(cli, cmd, config, logger);

    await invokeAction(cli, ["v2"], { verbose: true });
    const calledWithMsg = infoSpy.mock.calls.some(
      (c: unknown[]) => c[0] === "Verbose mode enabled"
    );
    expect(calledWithMsg).toBe(false);
  });
});
