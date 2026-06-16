// IMPORTANT: import the shared setup FIRST. Its module body installs the stable
// Bun.spawn dispatcher + the node:fs / load-env mocks BEFORE any command source
// is evaluated, so `../build` snapshots the dispatcher/mock (not the real ones).
// See setup.ts for the full rationale.
import {
  state,
  spawnCalls,
  writeCalls,
  unlinkCalls,
  rmCalls,
  copyCalls,
  mockMkdirSync,
  resetMocks,
} from "./setup";
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
const { buildCommand } = (await import("../build")) as {
  buildCommand: Command;
};

beforeEach(resetMocks);
afterEach(resetMocks);

const CWD = "/project";

describe("buildCommand.handler", () => {
  it("writes the temp entry file with the framework runEntry content", async () => {
    state.existsDefault = false; // src absent -> skip copy/config phase
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    const entryWrite = writeCalls.find((w) =>
      w.path.endsWith("/.damat/build-entry.ts"),
    );
    expect(entryWrite).toBeDefined();
    expect(entryWrite!.content).toBe(
      `import { runEntry } from "@damatjs/framework/entry";\nrunEntry();\n`,
    );
  });

  it("spawns `bun build` with the resolved entry/outfile/target args", async () => {
    state.existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "node", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0]!;
    expect(call.cwd).toBe(CWD);
    expect(call.cmd).toEqual([
      "bun",
      "build",
      "/project/.damat/build-entry.ts",
      "--outfile",
      "/project/.damat/dist/entry.js",
      "--target",
      "node",
      "--packages",
      "external",
    ]);
    expect(call.cmd).not.toContain("--minify"); // minify=false
  });

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

  it("returns the build subprocess exit code", async () => {
    state.spawnExitCode = 42;
    state.existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    const result = await buildCommand.handler(ctx);
    expect(result.exitCode).toBe(42);
  });

  it("resolves the output dir relative to ctx.cwd for a custom output", async () => {
    state.existsDefault = false;
    const { ctx } = createContext(
      { output: "custom-out", target: "bun", minify: false },
      { cwd: "/srv/app" },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls[0]!.cmd).toContain("/srv/app/custom-out/entry.js");
  });
});
