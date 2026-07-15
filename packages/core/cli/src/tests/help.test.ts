import { describe, expect, test } from "bun:test";
import { printCommandSpecificHelp, printDefaultHelp } from "../help";
import type { CliDefinition, Command } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

const command: Command = {
  name: "build",
  description: "Build the project",
  aliases: ["b"],
  usage: "build <target>",
  examples: ["cli build app"],
  options: [{ name: "output", description: "Output", default: "dist" }],
  subcommands: [
    {
      name: "watch",
      description: "Watch files",
      handler: async () => ({ exitCode: 0 }),
    },
  ],
  handler: async () => ({ exitCode: 0 }),
};

describe("help output", () => {
  test("default help writes description, commands, and global options", () => {
    const fixture = createRuntimeFixture();
    const config: CliDefinition = {
      name: "cli",
      version: "1.0.0",
      description: "A CLI",
      commands: [command],
      verbose: { enabled: true },
    };
    printDefaultHelp(config, [command], fixture.runtime.output);
    const output = fixture.messages.join("\n");
    expect(output).toContain("Usage: cli");
    expect(output).toContain("A CLI");
    expect(output).toContain("aliases: b");
    expect(output).toContain("--verbose");
  });

  test("default help omits command and verbose sections by default", () => {
    const fixture = createRuntimeFixture();
    const config: CliDefinition = { name: "cli", version: "1", commands: [] };
    printDefaultHelp(config, [], fixture.runtime.output);
    const output = fixture.messages.join("\n");
    expect(output).not.toContain("Commands:");
    expect(output).not.toContain("--verbose");
  });

  test("command help writes usage, options, examples, and subcommands", () => {
    const fixture = createRuntimeFixture();
    printCommandSpecificHelp({ name: "cli" }, command, fixture.runtime.output);
    const output = fixture.messages.join("\n");
    expect(output).toContain("Usage: cli build <target>");
    expect(output).toContain("--output");
    expect(output).toContain("Examples:");
    expect(output).toContain("Subcommands:");
  });

  test("command help generates usage and omits empty sections", () => {
    const fixture = createRuntimeFixture();
    const minimal = { ...command, usage: undefined, options: undefined,
      examples: undefined, subcommands: undefined };
    printCommandSpecificHelp({ name: "cli" }, minimal, fixture.runtime.output);
    expect(fixture.messages.join("\n")).toContain("cli build [options]");
  });
});
