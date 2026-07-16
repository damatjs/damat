// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../build` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import { state, spawnCalls, rmCalls, resetMocks } from "./setup";
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

describe("buildCommand.handler — type-check gate", () => {
  it("type-checks first (bunx tsc --noEmit) when a tsconfig.json exists", async () => {
    state.existsMap = { "/project/tsconfig.json": true }; // src absent -> stop after entry build
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(logger.info).toHaveBeenCalledWith("Type-checking app...");
    expect(spawnCalls[0]!.cmd).toEqual(["bunx", "tsc", "--noEmit"]);
    expect(spawnCalls[0]!.cwd).toBe(CWD);
    // The entry bundle is the SECOND spawn, after the type-check passes.
    expect(spawnCalls[1]!.cmd).toContain("build");
  });

  it("aborts before bundling when the type-check fails", async () => {
    state.existsMap = { "/project/tsconfig.json": true };
    state.spawnExitCode = 2; // the (first) tsc spawn fails
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    const result = await buildCommand.handler(ctx);

    expect(result.exitCode).toBe(2);
    expect(spawnCalls).toHaveLength(1); // only tsc; no entry/config build
    expect(spawnCalls[0]!.cmd).toEqual(["bunx", "tsc", "--noEmit"]);
    expect(rmCalls).toHaveLength(0); // never cleaned the output dir
    expect(logger.success).not.toHaveBeenCalled();
  });

  it("skips the type-check when --no-typecheck (typecheck:false) is passed", async () => {
    state.existsMap = { "/project/tsconfig.json": true }; // present, but opted out
    const { ctx, logger } = createContext(
      { output: ".damat/dist", target: "bun", minify: false, typecheck: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(logger.info).not.toHaveBeenCalledWith("Type-checking app...");
    expect(spawnCalls).toHaveLength(1); // entry build only, no tsc
    expect(spawnCalls[0]!.cmd[0]).toBe("bun"); // the entry bundle, not `bunx tsc`
    expect(spawnCalls[0]!.cmd).toContain("/project/.damat/build-entry.ts");
  });
});
