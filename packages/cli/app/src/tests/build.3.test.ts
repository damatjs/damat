// Import setup first so filesystem/environment mocks exist before command
// evaluation. Process spawning is resolved from Bun when each command runs.
import { state, unlinkCalls, copyCalls, resetMocks } from "./setup";
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
  it("removes the temp entry file after building", async () => {
    state.existsMap = { "/project/.damat/build-entry.ts": true };
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(unlinkCalls).toContain("/project/.damat/build-entry.ts");
  });

  it("copies src and logs success when build succeeds and src exists", async () => {
    state.spawnExitCode = 0;
    state.existsMap = { "/project/src": true }; // config file absent
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(logger.info).toHaveBeenCalledWith(
      "Copying source files to output directory...",
    );
    expect(copyCalls).toHaveLength(1);
    expect(copyCalls[0]).toEqual({
      src: "/project/src/app.ts",
      dest: "/project/.damat/dist/src/app.ts",
    });
    expect(logger.success).toHaveBeenCalledWith("Build complete!");
  });
});
