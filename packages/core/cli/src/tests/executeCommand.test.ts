import { describe, expect, test } from "bun:test";
import { CliError } from "../errors";
import { executeCommand } from "../run/executeCommand";
import type { CliDefinition, CommandContext } from "../types";
import { createRuntimeFixture } from "./runtimeFixture";

const base: CliDefinition = { name: "cli", version: "1", commands: [] };

describe("executeCommand", () => {
  test("normalizes options, attaches config, and returns a result", async () => {
    const fixture = createRuntimeFixture();
    let context: CommandContext | undefined;
    const result = await executeCommand(
      {
        name: "build",
        description: "Build",
        options: [
          { name: "port", type: "number" },
          { name: "verbose", type: "boolean" },
        ],
        handler: async (value) => ((context = value), { exitCode: 3 }),
      },
      "build",
      ["target"],
      { port: "42", verbose: true },
      base,
      fixture.runtime,
      { project: true },
    );
    expect(result).toEqual({ exitCode: 3, command: "build" });
    expect(context?.options).toMatchObject({
      port: 42,
      verbose: true,
      config: { project: true },
    });
    expect(fixture.infos).toEqual(["Verbose mode enabled"]);
    expect(fixture.debugs).toEqual(["Verbose mode enabled"]);
  });

  test("returns validation failures without invoking the handler", async () => {
    const fixture = createRuntimeFixture();
    let invoked = false;
    const result = await executeCommand(
      {
        name: "build",
        description: "Build",
        options: [{ name: "token", required: true }],
        handler: async () => ((invoked = true), { exitCode: 0 }),
      },
      "build",
      [],
      {},
      base,
      fixture.runtime,
      null,
    );
    expect(result.exitCode).toBe(1);
    expect(invoked).toBe(false);
    expect(fixture.errors[0]).toContain("token");
  });

  test("maps handler errors and calls onError", async () => {
    const fixture = createRuntimeFixture();
    let captured: Error | undefined;
    const result = await executeCommand(
      {
        name: "build",
        description: "Build",
        handler: async () => {
          throw new CliError("broken", 8);
        },
      },
      "build",
      [],
      {},
      { ...base, onError: (error) => (captured = error) },
      fixture.runtime,
      null,
    );
    expect(result).toEqual({ exitCode: 8, command: "build" });
    expect(captured?.message).toBe("broken");
  });

  test("manual verbose mode skips the automatic info message", async () => {
    const fixture = createRuntimeFixture();
    await executeCommand(
      { name: "x", description: "x", handler: async () => ({ exitCode: 0 }) },
      "x",
      [],
      { verbose: true },
      { ...base, verbose: { enabled: true, handler: "manual" } },
      fixture.runtime,
      null,
    );
    expect(fixture.infos).toEqual([]);
    expect(fixture.debugs).toEqual(["Verbose mode enabled"]);
  });
});
