// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../dev` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import { state, spawnCalls, unlinkCalls, resetMocks } from "./setup";
import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * dev.handler writes a temp entry file, optionally clears the console, loads
 * env vars and spawns `bun --watch`. The global fakes (recording Bun.spawn
 * dispatcher + node:fs + @damatjs/load-env mocks) live in ./setup; per-test
 * behaviour is driven by mutating the shared `state` and reading the shared
 * recording arrays.
 */

// Import the source AFTER setup installed the fakes (setup is imported first
// above). This binds `devCommand` for the assertions below.
const { devCommand } = (await import("../commands/dev")) as {
  devCommand: Command;
};

const CWD = "/project";
let clearSpy: ReturnType<typeof spyOn>;

// Preserve/restore the process.env values we mutate.
const savedNodeEnv = process.env.NODE_ENV;
const savedPort = process.env.PORT;

beforeEach(() => {
  resetMocks();
  // dev.handler reads process.env.PORT/NODE_ENV; start each test from a clean
  // slate so per-test sets/deletes below are the only influence.
  delete process.env.PORT;
  delete process.env.NODE_ENV;
  clearSpy = spyOn(console, "clear").mockImplementation(() => {});
});

afterEach(() => {
  clearSpy.mockRestore();
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
  if (savedPort === undefined) delete process.env.PORT;
  else process.env.PORT = savedPort;
});

describe("devCommand.handler", () => {
  it("uses the port option for PORT when process.env.PORT is unset", async () => {
    delete process.env.PORT;
    const { ctx } = createContext({ port: 4321, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(spawnCalls[0]!.env!.PORT).toBe("4321");
  });

  it("prefers an existing process.env.PORT over the port option", async () => {
    process.env.PORT = "9999";
    const { ctx } = createContext({ port: 4321, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(spawnCalls[0]!.env!.PORT).toBe("9999");
  });

  it("removes the temp entry file after the process exits", async () => {
    state.existsMap = { "/project/.damat/dev-entry.ts": true };
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(unlinkCalls).toContain("/project/.damat/dev-entry.ts");
  });

  it("returns the subprocess exit code", async () => {
    state.spawnExitCode = 7;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    const result = await devCommand.handler(ctx);
    expect(result.exitCode).toBe(7);
  });
});
