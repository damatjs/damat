import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { printDefaultHelp, printCommandSpecificHelp } from "../help";
import type { CliConfig, Command } from "../types";

describe("Help Printer", () => {
  let consoleOutput: string[] = [];
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

  test("should print default help with CLI name", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printDefaultHelp(config, []);

    const output = consoleOutput.join("\n");
    expect(output).toContain("test-cli");
    expect(output).toContain("Usage:");
  });

  test("should list all commands", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    const commands: Command[] = [
      {
        name: "build",
        description: "Build the project",
        handler: async () => ({ exitCode: 0 }),
      },
      {
        name: "test",
        description: "Run tests",
        handler: async () => ({ exitCode: 0 }),
      },
    ];

    printDefaultHelp(config, commands);

    const output = consoleOutput.join("\n");
    expect(output).toContain("build");
    expect(output).toContain("Build the project");
    expect(output).toContain("test");
    expect(output).toContain("Run tests");
  });

  test("should show global options", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    printDefaultHelp(config, []);

    const output = consoleOutput.join("\n");
    expect(output).toContain("--help");
    expect(output).toContain("--version");
  });

  test("should show verbose option when enabled", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      verbose: { enabled: true },
      commands: [],
    };

    printDefaultHelp(config, []);

    const output = consoleOutput.join("\n");
    expect(output).toContain("--verbose");
  });

  test("should print command-specific help", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    const command: Command = {
      name: "build",
      description: "Build the project",
      options: [
        { name: "output", description: "Output directory", default: "dist" },
      ],
      handler: async () => ({ exitCode: 0 }),
    };

    printCommandSpecificHelp(config, command);

    const output = consoleOutput.join("\n");
    expect(output).toContain("build");
    expect(output).toContain("Build the project");
    expect(output).toContain("--output");
    expect(output).toContain("Output directory");
  });

  test("should show command aliases", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    const command: Command = {
      name: "build",
      description: "Build the project",
      aliases: ["b", "bld"],
      handler: async () => ({ exitCode: 0 }),
    };

    printDefaultHelp(config, [command]);

    const output = consoleOutput.join("\n");
    expect(output).toContain("aliases:");
  });

  test("should show command examples", () => {
    const config: CliConfig = {
      name: "test-cli",
      version: "1.0.0",
      commands: [],
    };

    const command: Command = {
      name: "build",
      description: "Build the project",
      examples: ["test-cli build --output=dist", "test-cli build -o build"],
      handler: async () => ({ exitCode: 0 }),
    };

    printCommandSpecificHelp(config, command);

    const output = consoleOutput.join("\n");
    expect(output).toContain("Examples:");
  });
});
