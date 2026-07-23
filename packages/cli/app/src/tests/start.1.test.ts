// Import setup first so filesystem/environment mocks exist before command
// evaluation. Process spawning is resolved from Bun when each command runs.
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
  it("errors and returns exit code 1 when the build entry is missing", async () => {
    state.existsDefault = false; // entry.js does not exist
    const { ctx, logger } = createContext(
      { output: ".damat/dist" },
      { cwd: CWD },
    );

    const result = await startCommand.handler(ctx);

    expect(result.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      "Build not found. Run `damat build` first.",
    );
    // must not spawn or load env on the error path
    expect(spawnCalls).toHaveLength(0);
    expect(loadEnvCalls).toHaveLength(0);
  });

  it("checks for the entry at <cwd>/<output>/entry.js", async () => {
    state.existsDefault = false;
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(mockExistsSync).toHaveBeenCalledWith(
      "/project/.damat/dist/entry.js",
    );
  });

  it("spawns `bun run <entry>` from ctx.cwd when the build exists", async () => {
    state.existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    const result = await startCommand.handler(ctx);

    expect(result.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0]!;
    expect(call.cwd).toBe(CWD);
    expect(call.cmd).toEqual(["bun", "run", "/project/.damat/dist/entry.js"]);
  });
});
