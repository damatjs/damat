import { describe, expect, test } from "bun:test";
import { runCli } from "../run";
import type { CliDefinition, Command } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

function definition(received: unknown[]): CliDefinition {
  const dev: Command = {
    name: "dev",
    description: "Develop",
    handler: async (context) => {
      received.push(context.options.verbose);
      return { exitCode: 0 };
    },
  };
  return {
    name: "damat",
    version: "1",
    verbose: { enabled: true },
    commands: [
      {
        name: "module",
        description: "Modules",
        subcommands: [dev],
        handler: async () => ({ exitCode: 0 }),
      },
    ],
  };
}

describe("global verbose option", () => {
  test.each([
    ["before command dispatch", ["--verbose", "module", "dev"]],
    ["after a subcommand", ["module", "dev", "--verbose"]],
  ])("works %s", async (_label, args) => {
    const received: unknown[] = [];
    const fixture = createRuntimeFixture(args);
    const result = await runCli(definition(received), fixture.runtime);
    expect(result).toEqual({ exitCode: 0, command: "module:dev" });
    expect(received).toEqual([true]);
    expect(fixture.debugs).toEqual(["Verbose mode enabled"]);
  });

  test("is not consumed when the CLI has not enabled it", async () => {
    const fixture = createRuntimeFixture(["--verbose"]);
    const result = await runCli(
      { name: "plain", version: "1", commands: [] },
      fixture.runtime,
    );
    expect(result).toEqual({ exitCode: 1, command: "--verbose" });
  });
});
