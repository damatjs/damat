import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { formatCommandLine } from "../help/formatCommandLine";
import { formatOptionLine } from "../help/formatOptionLine";
import { printCommandSpecificHelp, printDefaultHelp } from "../help";
import type { Command, CommandOption, CliConfig } from "../types";

describe("formatCommandLine", () => {
  test("indents and pads the command name then appends the description", () => {
    const cmd: Command = {
      name: "build",
      description: "Build the project",
      handler: async () => ({ exitCode: 0 }),
    };
    expect(formatCommandLine(cmd)).toBe(
      "  " + "build".padEnd(20) + "Build the project",
    );
  });

  test("appends an aliases suffix when aliases are present", () => {
    const cmd: Command = {
      name: "build",
      description: "Build the project",
      aliases: ["b", "bld"],
      handler: async () => ({ exitCode: 0 }),
    };
    expect(formatCommandLine(cmd)).toContain("(aliases: b, bld)");
  });

  test("omits the aliases suffix for an empty aliases array", () => {
    const cmd: Command = {
      name: "build",
      description: "Build",
      aliases: [],
      handler: async () => ({ exitCode: 0 }),
    };
    expect(formatCommandLine(cmd)).not.toContain("aliases");
  });
});

describe("formatOptionLine", () => {
  test("renders a long flag only when no alias is set", () => {
    const opt: CommandOption = { name: "output", description: "Output dir" };
    const line = formatOptionLine(opt);
    expect(line).toContain("--output");
    expect(line).not.toContain("-o,");
    expect(line).toContain("Output dir");
  });

  test("renders 'alias, long-flag' when an alias is set", () => {
    const opt: CommandOption = {
      name: "output",
      alias: "o",
      description: "Output dir",
    };
    expect(formatOptionLine(opt)).toContain("-o, --output");
  });

  test("appends a JSON-encoded default when default is defined", () => {
    const opt: CommandOption = {
      name: "output",
      description: "d",
      default: "dist",
    };
    expect(formatOptionLine(opt)).toContain('(default: "dist")');
  });

  test("renders falsy defaults like false and 0 (not undefined)", () => {
    expect(
      formatOptionLine({ name: "minify", description: "d", default: false }),
    ).toContain("(default: false)");
    expect(
      formatOptionLine({ name: "retries", description: "d", default: 0 }),
    ).toContain("(default: 0)");
  });

  test("omits the default suffix when default is undefined", () => {
    const opt: CommandOption = {
      name: "x",
      description: "d",
      default: undefined,
    };
    expect(formatOptionLine(opt)).not.toContain("default:");
  });

  test("appends a [required] marker for required options", () => {
    const opt: CommandOption = {
      name: "name",
      description: "d",
      required: true,
    };
    expect(formatOptionLine(opt)).toContain("[required]");
  });

  test("can include both a default and the required marker", () => {
    const opt: CommandOption = {
      name: "env",
      description: "d",
      default: "prod",
      required: true,
    };
    const line = formatOptionLine(opt);
    expect(line).toContain('(default: "prod")');
    expect(line).toContain("[required]");
  });
});

describe("printCommandSpecificHelp - additional branches", () => {
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

  test("uses the explicit usage string when provided", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    const cmd: Command = {
      name: "deploy",
      description: "Deploy app",
      usage: "deploy <env> [--force]",
      handler: async () => ({ exitCode: 0 }),
    };
    printCommandSpecificHelp(config, cmd);
    const out = consoleOutput.join("\n");
    expect(out).toContain("Usage: mycli deploy <env> [--force]");
  });

  test("falls back to a generated usage line when usage is omitted", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    const cmd: Command = {
      name: "deploy",
      description: "Deploy app",
      handler: async () => ({ exitCode: 0 }),
    };
    printCommandSpecificHelp(config, cmd);
    expect(consoleOutput.join("\n")).toContain("Usage: mycli deploy [options]");
  });

  test("renders a Subcommands section listing each subcommand", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    const cmd: Command = {
      name: "db",
      description: "Database commands",
      subcommands: [
        {
          name: "db:migrate",
          description: "Run migrations",
          handler: async () => ({ exitCode: 0 }),
        },
        {
          name: "db:seed",
          description: "Seed the db",
          handler: async () => ({ exitCode: 0 }),
        },
      ],
      handler: async () => ({ exitCode: 0 }),
    };
    printCommandSpecificHelp(config, cmd);
    const out = consoleOutput.join("\n");
    expect(out).toContain("Subcommands:");
    expect(out).toContain("db:migrate");
    expect(out).toContain("Run migrations");
    expect(out).toContain("db:seed");
  });

  test("does not print an Options section when there are no options", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    const cmd: Command = {
      name: "noop",
      description: "Does nothing",
      handler: async () => ({ exitCode: 0 }),
    };
    printCommandSpecificHelp(config, cmd);
    expect(consoleOutput.join("\n")).not.toContain("Options:");
  });
});

describe("printDefaultHelp - additional branches", () => {
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

  test("prints the description line when config.description is set", () => {
    const config: CliConfig = {
      name: "mycli",
      version: "1.0.0",
      description: "My great CLI",
      commands: [],
    };
    printDefaultHelp(config, []);
    expect(consoleOutput.join("\n")).toContain("My great CLI");
  });

  test("omits the Commands section when there are no commands", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    printDefaultHelp(config, []);
    expect(consoleOutput.join("\n")).not.toContain("Commands:");
  });

  test("hides the verbose option when verbose is disabled", () => {
    const config: CliConfig = {
      name: "mycli",
      version: "1.0.0",
      verbose: { enabled: false },
      commands: [],
    };
    printDefaultHelp(config, []);
    expect(consoleOutput.join("\n")).not.toContain("--verbose");
  });

  test("shows the verbose option by default (verbose config omitted)", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    printDefaultHelp(config, []);
    expect(consoleOutput.join("\n")).toContain("--verbose");
  });

  test("includes the 'help <command>' hint with the CLI name", () => {
    const config: CliConfig = { name: "mycli", version: "1.0.0", commands: [] };
    printDefaultHelp(config, []);
    expect(consoleOutput.join("\n")).toContain(
      "Run 'mycli help <command>' for more information.",
    );
  });
});
