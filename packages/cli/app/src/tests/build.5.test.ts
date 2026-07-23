// Import setup first so filesystem/environment mocks exist before command
// evaluation. Process spawning is resolved from Bun when each command runs.
import { state, spawnCalls, copyCalls, resetMocks } from "./setup";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * build.handler spawns `bun build` subprocesses and touches the filesystem.
 * The global fakes (recording Bun.spawn dispatcher + node:fs mock) live in
 * ./setup; per-test behaviour is driven by mutating the shared `state` and
 * reading the shared recording arrays. `node:path`'s join is left real (pure)
 * — assertions depend on real joining.
 *
 * copyDir: setup's mocked readdirSync returns ["app.ts"] and statSync reports a
 * non-directory by default, so the source performs exactly one copy.
 */

// Import the source AFTER setup installed the fakes (setup is imported first
// above). This binds `buildCommand` for the assertions below.
const { buildCommand } = (await import("../commands/build")) as {
  buildCommand: Command;
};

beforeEach(resetMocks);
afterEach(resetMocks);

const CWD = "/project";

describe("buildCommand.handler", () => {
  it("builds damat.config.ts with a second spawn when a config file exists", async () => {
    state.spawnExitCode = 0;
    state.existsMap = {
      "/project/src": true,
      "/project/damat.config.ts": true,
    };
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls).toHaveLength(2);
    expect(logger.info).toHaveBeenCalledWith("Building config file...");
    expect(spawnCalls[1]!.cmd).toEqual([
      "bun",
      "build",
      "/project/damat.config.ts",
      "--outfile",
      "/project/.damat/dist/damat.config.js",
      "--target",
      "bun",
      "--external",
      "pg-cloudflare",
    ]);
  });

  it("skips copy/config phase and success log when build fails", async () => {
    state.spawnExitCode = 1;
    state.existsMap = {
      "/project/src": true,
      "/project/damat.config.ts": true,
    };
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    const result = await buildCommand.handler(ctx);

    expect(result.exitCode).toBe(1);
    expect(spawnCalls).toHaveLength(1); // only main build, no config build
    expect(copyCalls).toHaveLength(0);
    expect(logger.success).not.toHaveBeenCalled();
  });
});
