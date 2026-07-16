// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../start` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import {
  state,
  spawnCalls,
  loadEnvCalls,
  mockExistsSync,
  resetMocks,
} from "./setup";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * start.handler verifies the built entry exists, loads env and spawns
 * `bun run <entry>`. The global fakes (recording Bun.spawn dispatcher + node:fs
 * + @damatjs/load-env mocks) live in ./setup; per-test behaviour is driven by
 * mutating the shared `state` and reading the shared recording arrays. Both the
 * missing-build error path and the happy path are asserted.
 */

// Import the source AFTER setup installed the fakes (setup is imported first
// above). This binds `startCommand` for the assertions below.
const { startCommand } = (await import("../commands/start")) as {
  startCommand: Command;
};

const CWD = "/project";
const savedNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  resetMocks();
  // start.handler reads process.env.NODE_ENV; clear it so per-test sets below
  // are the only influence.
  delete process.env.NODE_ENV;
});
afterEach(() => {
  resetMocks();
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
});

describe("startCommand.handler", () => {
  it("loads env with 'production' default and process.cwd()", async () => {
    delete process.env.NODE_ENV;
    state.existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(loadEnvCalls).toHaveLength(1);
    expect(loadEnvCalls[0]![0]).toBe("production");
    expect(loadEnvCalls[0]![1]).toBe(process.cwd());
  });

  it("loads env with the value of NODE_ENV when set", async () => {
    process.env.NODE_ENV = "production-eu";
    state.existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(loadEnvCalls[0]![0]).toBe("production-eu");
  });

  it("respects a custom output directory", async () => {
    state.existsMap = { "/project/build/entry.js": true };
    const { ctx } = createContext({ output: "build" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(mockExistsSync).toHaveBeenCalledWith("/project/build/entry.js");
    expect(spawnCalls[0]!.cmd).toContain("/project/build/entry.js");
  });

  it("returns the subprocess exit code on the happy path", async () => {
    state.spawnExitCode = 3;
    state.existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    const result = await startCommand.handler(ctx);
    expect(result.exitCode).toBe(3);
  });
});
