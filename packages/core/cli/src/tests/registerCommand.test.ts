import { describe, expect, test } from "bun:test";
import { cac } from "cac";
import { registerSingleCommand } from "../run/registerCommand";
import type { CliDefinition, CliRunResult, CommandContext } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

const config: CliDefinition = { name: "cli", version: "1", commands: [] };
const project = { get: async () => null };

describe("registerSingleCommand", () => {
  test("does not register a parent command", () => {
    const cli = cac("cli");
    const fixture = createRuntimeFixture(["db"]);
    registerSingleCommand(
      cli,
      {
        name: "db",
        description: "DB",
        subcommands: [],
        handler: async () => ({ exitCode: 0 }),
      },
      config,
      fixture.runtime,
      project,
    );
    expect(cli.commands).toEqual([]);
  });

  test("registers aliases/options and returns the handler result", async () => {
    const cli = cac("cli");
    const fixture = createRuntimeFixture(["b", "--port", "42"]);
    let context: CommandContext | undefined;
    registerSingleCommand(
      cli,
      {
        name: "build",
        aliases: ["b"],
        description: "Build",
        options: [{ name: "port", type: "number" }],
        handler: async (value) => ((context = value), { exitCode: 6 }),
      },
      config,
      fixture.runtime,
      project,
    );
    cli.parse(["bun", "cli", ...fixture.runtime.args], { run: false });
    const result = (await cli.runMatchedCommand()) as CliRunResult;
    expect(result).toEqual({ exitCode: 6, command: "build" });
    expect(context?.options.port).toBe(42);
  });
});
