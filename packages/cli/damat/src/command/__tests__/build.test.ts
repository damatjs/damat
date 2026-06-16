import {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import { createContext, fakeSpawnResult } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * build.handler spawns `bun build` subprocesses and touches the filesystem.
 * To assert the wiring without spawning anything we:
 *   - mock `node:fs` via mock.module (Bun intercepts node builtins reliably);
 *   - replace `Bun.spawn` with a recording fake BEFORE the source module is
 *     imported. Bun's `import { spawn } from "bun"` snapshots `Bun.spawn` at
 *     module-evaluation time, and `mock.module("bun", ...)` does NOT intercept
 *     the synthetic `bun` namespace in this Bun version, so reassigning
 *     `Bun.spawn` first (then dynamically importing the command) is the only
 *     way to capture the call without launching a real process.
 *
 * `node:path`'s join is left real (pure) — assertions depend on real joining.
 */

// --- Bun.spawn fake (installed before importing the source) -----------------
type SpawnCall = { cmd: string[]; cwd?: string; [k: string]: unknown };
const spawnCalls: SpawnCall[] = [];
let spawnExitCode = 0;
const originalSpawn = Bun.spawn;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawn = (opts: SpawnCall) => {
  spawnCalls.push(opts);
  return fakeSpawnResult(spawnExitCode);
};

// --- node:fs mock ----------------------------------------------------------
let existsMap: Record<string, boolean> = {};
let existsDefault = false;
const mockExistsSync = mock((p: string) => existsMap[p] ?? existsDefault);
const mockMkdirSync = mock((_p: string, _o?: unknown) => {});
const writeCalls: Array<{ path: string; content: string }> = [];
const mockWriteFileSync = mock((p: string, content: string) => {
  writeCalls.push({ path: p, content });
});
const unlinkCalls: string[] = [];
const mockUnlinkSync = mock((p: string) => {
  unlinkCalls.push(p);
});
const rmCalls: Array<{ path: string; opts?: unknown }> = [];
const mockRmSync = mock((p: string, opts?: unknown) => {
  rmCalls.push({ path: p, opts });
});
// copyDir: pretend src holds a single file so it performs exactly one copy.
const mockReaddirSync = mock((_p: string) => ["app.ts"]);
const mockStatSync = mock((_p: string) => ({ isDirectory: () => false }));
const copyCalls: Array<{ src: string; dest: string }> = [];
const mockCopyFileSync = mock((src: string, dest: string) => {
  copyCalls.push({ src, dest });
});

mock.module("node:fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync,
  rmSync: mockRmSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  copyFileSync: mockCopyFileSync,
}));

// Import the source AFTER the fake spawn + fs mocks are installed.
const { buildCommand } = (await import("../build")) as {
  buildCommand: Command;
};

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Bun as any).spawn = originalSpawn;
});

function resetMocks() {
  spawnCalls.length = 0;
  writeCalls.length = 0;
  unlinkCalls.length = 0;
  rmCalls.length = 0;
  copyCalls.length = 0;
  spawnExitCode = 0;
  existsMap = {};
  existsDefault = false;
  mockExistsSync.mockClear();
  mockMkdirSync.mockClear();
  mockWriteFileSync.mockClear();
  mockUnlinkSync.mockClear();
  mockRmSync.mockClear();
  mockReaddirSync.mockClear();
  mockStatSync.mockClear();
  mockCopyFileSync.mockClear();
}

beforeEach(resetMocks);
afterEach(resetMocks);

const CWD = "/project";

describe("buildCommand.handler", () => {
  it("writes the temp entry file with the framework runEntry content", async () => {
    existsDefault = false; // src absent -> skip copy/config phase
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
    existsDefault = false;
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
    existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: true },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls[0]!.cmd).toContain("--minify");
    expect(spawnCalls[0]!.cmd.at(-1)).toBe("--minify");
  });

  it("cleans an existing output directory before building", async () => {
    existsMap = {
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
    existsDefault = false;
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
    existsMap = { "/project/.damat/build-entry.ts": true };
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    await buildCommand.handler(ctx);

    expect(unlinkCalls).toContain("/project/.damat/build-entry.ts");
  });

  it("copies src and logs success when build succeeds and src exists", async () => {
    spawnExitCode = 0;
    existsMap = { "/project/src": true }; // config file absent
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
    spawnExitCode = 0;
    existsMap = {
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
    spawnExitCode = 1;
    existsMap = {
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
    spawnExitCode = 42;
    existsDefault = false;
    const { ctx } = createContext(
      { output: ".damat/dist", target: "bun", minify: false },
      { cwd: CWD },
    );

    const result = await buildCommand.handler(ctx);
    expect(result.exitCode).toBe(42);
  });

  it("resolves the output dir relative to ctx.cwd for a custom output", async () => {
    existsDefault = false;
    const { ctx } = createContext(
      { output: "custom-out", target: "bun", minify: false },
      { cwd: "/srv/app" },
    );

    await buildCommand.handler(ctx);

    expect(spawnCalls[0]!.cmd).toContain("/srv/app/custom-out/entry.js");
  });
});
