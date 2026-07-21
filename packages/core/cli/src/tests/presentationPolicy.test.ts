import { expect, spyOn, test } from "bun:test";
import { runCli } from "../run";
import type { CliDefinition } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

test("minimal config has no implicit banner or verbose option", async () => {
  const fixture = createRuntimeFixture([]);
  const consoleLog = spyOn(console, "log").mockImplementation(() => {});
  const config: CliDefinition = { name: "cli", version: "1.0.0", commands: [] };

  try {
    expect(await runCli(config, fixture.runtime)).toEqual({ exitCode: 0 });
    const output = fixture.messages.join("\n");
    expect(output).toContain("Usage: cli");
    expect(output).not.toContain("┌");
    expect(output).not.toContain("--verbose");
    expect(consoleLog).not.toHaveBeenCalled();
  } finally {
    consoleLog.mockRestore();
  }
});

test("configured banner and verbose option remain available", async () => {
  const fixture = createRuntimeFixture([]);
  const config: CliDefinition = {
    name: "cli",
    version: "1.0.0",
    commands: [],
    banner: { style: "boxed", title: "Damat" },
    verbose: { enabled: true },
  };

  expect(await runCli(config, fixture.runtime)).toEqual({ exitCode: 0 });
  const output = fixture.messages.join("\n");
  expect(output).toContain("Damat");
  expect(output).toContain("┌");
  expect(output).toContain("--verbose");
});
