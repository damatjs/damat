// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../build` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import { state, spawnCalls, rmCalls, mockMkdirSync, resetMocks } from "./setup";
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
  it("appends --minify when the minify option is true", async () => {
    state.existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: true },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls[0]!.cmd).toContain("--minify");
    expect(spawnCalls[0]!.cmd.at(-1)).toBe("--minify");
  });

  it("cleans an existing output directory before building", async () => {
    state.existsMap = {
      "/project/.damat": true,
      "/project/.damat/dist": true,
    };
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(rmCalls).toHaveLength(1);
    expect(rmCalls[0]).toEqual({
      path: "/project/.damat/dist",
      opts: { recursive: true, force: true },
    });
    expect(logger.info).toHaveBeenCalledWith("Cleaning old build...");
  });

  it("creates the .damat dir when it does not exist", async () => {
    state.existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(mockMkdirSync).toHaveBeenCalledWith("/project/.damat", {
      recursive: true,
    });
  });
});
