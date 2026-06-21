import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { Logger } from "@damatjs/logger";
import { runCli } from "../run/runCli";
import { getRegistry, clearRegistry } from "../registry";
import { clearConfigCache } from "../config";
import type { CliConfig, Command } from "../types";

class ExitSignal extends Error {
  constructor(public code: number) {
    super(`__exit__:${code}`);
  }
}

const exitCodes: number[] = [];
const originalArgv = process.argv;

function makeCmd(name: string, overrides: Partial<Command> = {}): Command {
  return {
    name,
    description: `${name} description`,
    handler: async () => ({ exitCode: 0 }),
    ...overrides,
  };
}

describe("runCli", () => {
  let exitSpy: ReturnType<typeof spyOn>;
  let loggerErrorSpy: ReturnType<typeof spyOn>;
  let consoleOutput: string[];
  let originalLog: typeof console.log;

  beforeEach(() => {
    clearRegistry();
    clearConfigCache();
    exitCodes.length = 0;
    exitSpy = spyOn(process, "exit").mockImplementation(((code?: number) => {
      exitCodes.push(code ?? 0);
      throw new ExitSignal(code ?? 0);
    }) as never);
    // runCli constructs its own internal Logger; silence its error output so the
    // unknown-command test does not leak to stderr. (We assert via exit code.)
    loggerErrorSpy = spyOn(Logger.prototype, "error").mockImplementation(() => {});
    consoleOutput = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(" "));
    };
  });

  afterEach(() => {
    exitSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    console.log = originalLog;
    process.argv = originalArgv;
    clearRegistry();
    clearConfigCache();
  });

  /** Run runCli with a stubbed argv, swallowing the ExitSignal sentinel. */
  async function run(config: CliConfig, args: string[]): Promise<void> {
    process.argv = ["node", config.name, ...args];
    try {
      await runCli(config);
    } catch (err) {
      if (!(err instanceof ExitSignal)) throw err;
    }
  }

  test("throws when config has no name", async () => {
    await expect(
      runCli({ version: "1.0.0", commands: [] } as unknown as CliConfig)
    ).rejects.toThrow("CLI config must have a 'name' property");
  });

  test("throws when config has no version", async () => {
    await expect(
      runCli({ name: "cli", commands: [] } as unknown as CliConfig)
    ).rejects.toThrow("CLI config must have a 'version' property");
  });

  test("registers all configured commands into the registry", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("build"), makeCmd("test")],
    };
    await run(config, ["--help"]);
    expect(getRegistry().get("build")).toBeDefined();
    expect(getRegistry().get("test")).toBeDefined();
  });

  test("clears the registry on each run (no leakage across invocations)", async () => {
    const first: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("alpha")],
    };
    await run(first, ["--help"]);
    expect(getRegistry().get("alpha")).toBeDefined();

    const second: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("beta")],
    };
    await run(second, ["--help"]);
    expect(getRegistry().get("alpha")).toBeUndefined();
    expect(getRegistry().get("beta")).toBeDefined();
  });

  test("prints default help and exits 0 when no args are given", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("build")],
    };
    await run(config, []);
    expect(exitCodes[0]).toBe(0);
    expect(consoleOutput.join("\n")).toContain("Usage:");
  });

  test("prints default help and exits 0 for --help", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("build")],
    };
    await run(config, ["--help"]);
    expect(exitCodes[0]).toBe(0);
    expect(consoleOutput.join("\n")).toContain("Usage:");
  });

  test("prints default help and exits 0 for -h", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [],
    };
    await run(config, ["-h"]);
    expect(exitCodes[0]).toBe(0);
  });

  test("prints the banner unless disabled", async () => {
    const config: CliConfig = {
      name: "fancycli",
      version: "1.0.0",
      description: "A fancy CLI",
      commands: [],
    };
    await run(config, ["--help"]);
    const out = consoleOutput.join("\n");
    // Default boxed banner contains box-drawing characters and the name.
    expect(out).toContain("fancycli");
    expect(out).toContain("┌");
  });

  test("suppresses the banner when banner is false", async () => {
    const config: CliConfig = {
      name: "plaincli",
      version: "1.0.0",
      banner: false,
      commands: [],
    };
    await run(config, ["--help"]);
    expect(consoleOutput.join("\n")).not.toContain("┌");
  });

  test("honors a custom banner style", async () => {
    const config: CliConfig = {
      name: "minicli",
      version: "1.0.0",
      banner: { style: "minimal", title: "MINI" },
      commands: [],
    };
    await run(config, ["--help"]);
    const out = consoleOutput.join("\n");
    expect(out).toContain("MINI");
    expect(out).not.toContain("┌");
  });

  test("reports an unknown command, prints help, and exits 1", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("build")],
    };
    await run(config, ["bogus"]);
    expect(exitCodes[0]).toBe(1);
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(loggerErrorSpy.mock.calls[0]?.[0]).toBe("Unknown command: bogus");
    // Default help is also printed after the error.
    expect(consoleOutput.join("\n")).toContain("Usage:");
  });

  test("falls back to the default command, forwarding the unknown token as an arg", async () => {
    let received:
      | { args: string[]; command: string; options: Record<string, unknown> }
      | null = null;
    const create = makeCmd("create", {
      options: [
        { name: "module", type: "boolean", description: "module", default: false },
      ],
      handler: async (ctx) => {
        received = { args: ctx.args, command: ctx.command, options: ctx.options };
        return { exitCode: 0 };
      },
    });
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      defaultCommand: "create",
      commands: [create],
    };

    // `cli my-app --module` -> `create my-app --module` (no `create` typed).
    await run(config, ["my-app", "--module"]);

    expect(received).not.toBeNull();
    expect(received!.command).toBe("create");
    expect(received!.args).toEqual(["my-app"]);
    expect(received!.options.module).toBe(true);
    expect(exitCodes[0]).toBe(0);
    // The unknown-command error is NOT raised when a default command handles it.
    expect(loggerErrorSpy).not.toHaveBeenCalled();
  });

  test("still reports an unknown command when no default command is configured", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [makeCmd("create")],
    };
    await run(config, ["my-app"]);
    expect(exitCodes[0]).toBe(1);
    expect(loggerErrorSpy.mock.calls[0]?.[0]).toBe("Unknown command: my-app");
  });

  test("dispatches a subcommand handler and exits with its result code", async () => {
    let calledWith: { args: string[]; command: string } | null = null;
    const sub = makeCmd("db:migrate", {
      handler: async (ctx) => {
        calledWith = { args: ctx.args, command: ctx.command };
        return { exitCode: 7 };
      },
    });
    const parent = makeCmd("db", {
      subcommands: [sub],
    });
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [parent],
    };

    await run(config, ["db", "migrate", "extra-arg"]);

    expect(exitCodes[0]).toBe(7);
    expect(calledWith).not.toBeNull();
    expect(calledWith!.command).toBe("db:migrate");
    // Args after "db migrate" are forwarded.
    expect(calledWith!.args).toEqual(["extra-arg"]);
  });

  test("forwards parsed options/flags to the dispatched subcommand handler", async () => {
    let received: Record<string, unknown> | null = null;
    const sub = makeCmd("db:migrate", {
      options: [
        { name: "name", type: "string", description: "migration name" },
        { name: "force", alias: "f", type: "boolean", description: "force" },
        { name: "count", type: "number", description: "count", default: 5 },
      ],
      handler: async (ctx) => {
        received = ctx.options;
        return { exitCode: 0 };
      },
    });
    const parent = makeCmd("db", { subcommands: [sub] });
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [parent],
    };

    // --name=foo (= syntax), -f (boolean alias), and the unspecified --count
    // should reach the subcommand handler — not be dropped during dispatch.
    await run(config, ["db", "migrate", "--name=foo", "-f"]);

    expect(received).not.toBeNull();
    expect(received!.name).toBe("foo");
    expect(received!.force).toBe(true);
    // Defaults from the subcommand's own option defs are applied too.
    expect(received!.count).toBe(5);
  });

  test("does not dispatch a subcommand when only the parent is given", async () => {
    let subCalled = false;
    const sub = makeCmd("db:migrate", {
      handler: async () => {
        subCalled = true;
        return { exitCode: 0 };
      },
    });
    const parent = makeCmd("db", { subcommands: [sub] });
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      commands: [parent],
    };

    // Only "db" given -> falls through to cli.parse(); no subcommand dispatch.
    await run(config, ["db"]);
    expect(subCalled).toBe(false);
  });

  test("does not register the global --verbose flag when verbose is disabled", async () => {
    const config: CliConfig = {
      name: "cli",
      version: "1.0.0",
      banner: false,
      verbose: { enabled: false },
      commands: [],
    };
    await run(config, ["--help"]);
    // printDefaultHelp omits --verbose when disabled.
    expect(consoleOutput.join("\n")).not.toContain("--verbose");
  });
});
