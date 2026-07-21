import { expect, test } from "bun:test";
import { CliError } from "../errors";
import { runCommand } from "../run/runCommand";
import type { CliDefinition, Command } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

const command: Command = {
  name: "build",
  description: "Build",
  handler: async () => ({ exitCode: 0 }),
};
const config: CliDefinition = {
  name: "cli",
  version: "1",
  commands: [command],
};

test("runCommand works without project configuration", async () => {
  const fixture = createRuntimeFixture();
  let options: Record<string, unknown> | undefined;
  const result = await runCommand(
    {
      ...command,
      handler: async (ctx) => ((options = ctx.options), { exitCode: 0 }),
    },
    "build",
    [],
    {},
    config,
    fixture.runtime,
    undefined,
  );

  expect(result).toEqual({ exitCode: 0, command: "build" });
  expect(options).toEqual({});
});

test("runCommand maps project-config loading failures", async () => {
  const fixture = createRuntimeFixture();
  const result = await runCommand(
    command,
    "build",
    [],
    {},
    config,
    fixture.runtime,
    {
      get: async () => {
        throw new CliError("bad config", 9);
      },
    },
  );

  expect(result).toEqual({ exitCode: 9, command: "build" });
  expect(fixture.errors[0]).toContain("Failed to load configuration");
});
