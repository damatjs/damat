import { describe, expect, test } from "bun:test";
import { cac } from "cac";
import { createCommandRegistry } from "../registry";
import { handleHelpCommand } from "../run/helpCommand";
import type { CliDefinition, CliRunResult, CommandRegistry } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

const config: CliDefinition = { name: "cli", version: "1.0.0", commands: [] };

async function invoke(
  args: string[],
  registry: CommandRegistry = createCommandRegistry(),
) {
  const fixture = createRuntimeFixture(args);
  const cli = cac("cli");
  handleHelpCommand(cli, config, fixture.runtime, registry);
  cli.parse(["bun", "cli", ...args], { run: false });
  const result = (await cli.runMatchedCommand()) as CliRunResult;
  return { fixture, cli, result };
}

describe("handleHelpCommand", () => {
  test("registers the help command and prints default help", async () => {
    const { cli, fixture, result } = await invoke(["help"]);
    expect(cli.commands.some((command) => command.name === "help")).toBe(true);
    expect(result).toEqual({ exitCode: 0 });
    expect(fixture.messages.join("\n")).toContain("Usage: cli");
  });

  test("prints command help through an alias", async () => {
    const registry = createCommandRegistry();
    registry.register({
      name: "build",
      aliases: ["b"],
      description: "Build it",
      handler: async () => ({ exitCode: 0 }),
    });
    const { fixture, result } = await invoke(["help", "b"], registry);
    expect(result).toEqual({ exitCode: 0, command: "build" });
    expect(fixture.messages.join("\n")).toContain("Command: build");
  });

  test("returns one for an unknown help target", async () => {
    const { fixture, result } = await invoke(["help", "missing"]);
    expect(result).toEqual({ exitCode: 1, command: "missing" });
    expect(fixture.errors).toEqual(["Unknown command: missing"]);
  });
});
