import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { cac } from "cac";
import { Logger } from "@damatjs/logger";
import { handleHelpCommand } from "../run/helpCommand";
import { getRegistry, clearRegistry } from "../registry";
import type { CliConfig } from "../types";

class ExitSignal extends Error {
  constructor(public code: number) {
    super(`__exit__:${code}`);
  }
}

const exitCodes: number[] = [];

/** Invoke cac's matched action with the given positional arg, swallowing ExitSignal. */
async function invokeHelp(
  cli: ReturnType<typeof cac>,
  argv: string[],
): Promise<void> {
  cli.parse(["node", "cli", ...argv], { run: false });
  const matched = (
    cli as unknown as {
      matchedCommand?: { commandAction?: (...a: unknown[]) => unknown };
    }
  ).matchedCommand;
  if (!matched?.commandAction) return;
  try {
    // `help [command]` -> action(commandName, options)
    await matched.commandAction(argv[1], {});
  } catch (err) {
    if (!(err instanceof ExitSignal)) throw err;
  }
}

describe("handleHelpCommand", () => {
  let exitSpy: ReturnType<typeof spyOn>;
  let consoleOutput: string[];
  let originalLog: typeof console.log;
  let logger: Logger;
  let logErrorSpy: ReturnType<typeof spyOn>;
  const config: CliConfig = { name: "cli", version: "1.0.0", commands: [] };

  beforeEach(() => {
    clearRegistry();
    exitCodes.length = 0;
    exitSpy = spyOn(process, "exit").mockImplementation(((code?: number) => {
      exitCodes.push(code ?? 0);
      throw new ExitSignal(code ?? 0);
    }) as never);
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
    logger = new Logger({ timestamp: false });
    logErrorSpy = spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    console.log = originalLog;
    clearRegistry();
  });

  test("registers a 'help' command on the cac instance", () => {
    const cli = cac("cli");
    handleHelpCommand(cli, config, logger);
    const helpCmd = cli.commands.find((c) => c.name === "help");
    expect(helpCmd).toBeDefined();
    expect(helpCmd?.rawName).toBe("help [command]");
    expect(helpCmd?.description).toBe("Show help for a command");
  });

  test("prints default help and exits 0 when no command name is given", async () => {
    const cli = cac("cli");
    getRegistry().register({
      name: "build",
      description: "Build it",
      handler: async () => ({ exitCode: 0 }),
    });
    handleHelpCommand(cli, config, logger);

    await invokeHelp(cli, ["help"]);

    expect(exitCodes[0]).toBe(0);
    const out = consoleOutput.join("\n");
    expect(out).toContain("Usage:");
    expect(out).toContain("build");
  });

  test("prints command-specific help and exits 0 for a known command", async () => {
    const cli = cac("cli");
    getRegistry().register({
      name: "deploy",
      description: "Deploy the app",
      handler: async () => ({ exitCode: 0 }),
    });
    handleHelpCommand(cli, config, logger);

    await invokeHelp(cli, ["help", "deploy"]);

    expect(exitCodes[0]).toBe(0);
    const out = consoleOutput.join("\n");
    expect(out).toContain("Command: deploy");
    expect(out).toContain("Deploy the app");
  });

  test("logs an error and exits 1 for an unknown command", async () => {
    const cli = cac("cli");
    handleHelpCommand(cli, config, logger);

    await invokeHelp(cli, ["help", "nope"]);

    expect(exitCodes[0]).toBe(1);
    expect(logErrorSpy).toHaveBeenCalled();
    expect(logErrorSpy.mock.calls[0]?.[0]).toBe("Unknown command: nope");
  });

  test("resolves command-specific help through an alias", async () => {
    const cli = cac("cli");
    getRegistry().register({
      name: "build",
      description: "Build it",
      aliases: ["b"],
      handler: async () => ({ exitCode: 0 }),
    });
    handleHelpCommand(cli, config, logger);

    await invokeHelp(cli, ["help", "b"]);

    expect(exitCodes[0]).toBe(0);
    expect(consoleOutput.join("\n")).toContain("Command: build");
  });
});
