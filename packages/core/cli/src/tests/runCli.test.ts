import { describe, expect, test } from "bun:test";
import { runCli } from "../run";
import type { CliDefinition, Command } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

function command(name: string, exitCode = 0): Command {
  return {
    name,
    description: name,
    handler: async () => ({ exitCode }),
  };
}

async function run(definition: CliDefinition, args: string[]) {
  const fixture = createRuntimeFixture(args);
  const result = await runCli(definition, fixture.runtime);
  return { fixture, result };
}

describe("runCli navigation", () => {
  test("validates required definition identity", async () => {
    await expect(
      runCli({ version: "1", commands: [] } as CliDefinition),
    ).rejects.toThrow("name");
    await expect(
      runCli({ name: "cli", commands: [] } as CliDefinition),
    ).rejects.toThrow("version");
  });

  test("returns help and version results", async () => {
    const config = { name: "cli", version: "1.2.3", commands: [] };
    expect((await run(config, ["--help"])).result).toEqual({ exitCode: 0 });
    const version = await run(config, ["--version"]);
    expect(version.result).toEqual({ exitCode: 0 });
    expect(version.fixture.messages).toEqual(["1.2.3"]);
  });

  test("returns an unknown-command result and help", async () => {
    const value = await run({ name: "cli", version: "1", commands: [] }, [
      "missing",
    ]);
    expect(value.result).toEqual({ exitCode: 1, command: "missing" });
    expect(value.fixture.errors).toEqual(["Unknown command: missing"]);
    expect(value.fixture.messages.join("\n")).toContain("Usage: cli");
  });

  test("dispatches a default command with positional arguments", async () => {
    let args: string[] = [];
    const create = command("create");
    create.handler = async (context) => (
      (args = context.args),
      { exitCode: 2 }
    );
    const value = await run(
      {
        name: "cli",
        version: "1",
        commands: [create],
        defaultCommand: "create",
      },
      ["project"],
    );
    expect(value.result).toEqual({ exitCode: 2, command: "create" });
    expect(args).toEqual(["project"]);
  });

  test("dispatches namespaced subcommands", async () => {
    const add = command("add", 5);
    const module = command("module");
    module.subcommands = [add];
    const value = await run({ name: "cli", version: "1", commands: [module] }, [
      "module",
      "add",
    ]);
    expect(value.result).toEqual({ exitCode: 5, command: "module:add" });
  });
});
