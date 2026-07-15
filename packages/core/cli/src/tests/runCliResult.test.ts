import { expect, spyOn, test } from "bun:test";
import { runCli } from "../run";
import type { CliDefinition } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

test("runCli returns a result without terminating its host", async () => {
  const fixture = createRuntimeFixture(["build"]);
  const exit = spyOn(process, "exit").mockImplementation(() => undefined as never);
  const config: CliDefinition = {
    name: "cli",
    version: "1.0.0",
    commands: [
      {
        name: "build",
        description: "Build",
        handler: async () => ({ exitCode: 7 }),
      },
    ],
  };
  let continued = false;

  try {
    const result = await runCli(config, fixture.runtime);
    continued = true;
    expect(result).toEqual({ exitCode: 7, command: "build" });
    expect(exit).not.toHaveBeenCalled();
    expect(continued).toBe(true);
  } finally {
    exit.mockRestore();
  }
});

test("concurrent invocations keep command registries isolated", async () => {
  const first = createRuntimeFixture(["run"]);
  const second = createRuntimeFixture(["run"]);
  const makeConfig = (exitCode: number): CliDefinition => ({
    name: `cli-${exitCode}`,
    version: "1.0.0",
    banner: false,
    commands: [
      {
        name: "run",
        description: "Run",
        handler: async () => ({ exitCode }),
      },
    ],
  });

  const results = await Promise.all([
    runCli(makeConfig(3), first.runtime),
    runCli(makeConfig(4), second.runtime),
  ]);

  expect(results).toEqual([
    { exitCode: 3, command: "run" },
    { exitCode: 4, command: "run" },
  ]);
});
