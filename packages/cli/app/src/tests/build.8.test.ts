// Import setup first so filesystem/environment mocks exist before command
// evaluation. Process spawning is resolved from Bun when each command runs.
import { state, spawnCalls, resetMocks, setSpawnHandler } from "./setup";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createContext, fakeSpawnResult } from "./helpers";
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

describe("buildCommand.handler — type-check gate", () => {
  it("fails the build when the config bundle fails", async () => {
    state.existsMap = {
      "/project/src": true,
      "/project/damat.config.ts": true,
      // no tsconfig.json -> type-check skipped, isolating the config path
    };
    // Entry build succeeds; the config build (damat.config.ts) fails.
    setSpawnHandler((opts) => {
      spawnCalls.push(opts);
      const isConfig = opts.cmd.includes("/project/damat.config.ts");
      return fakeSpawnResult(isConfig ? 1 : 0);
    });
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    const result = await buildCommand.handler(ctx);

    expect(result.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("Config build failed");
    expect(logger.success).not.toHaveBeenCalled();
  });
});
