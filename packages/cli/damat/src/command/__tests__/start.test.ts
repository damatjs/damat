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
 * start.handler verifies the built entry exists, loads env and spawns
 * `bun run <entry>`. We replace `Bun.spawn` with a recording fake before
 * importing the source (see build.test.ts for the rationale) and mock node:fs
 * + @damatjs/load-env via mock.module. Both the missing-build error path and
 * the happy path are asserted.
 */

// --- Bun.spawn fake (installed before importing the source) -----------------
type SpawnCall = {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string>;
  [k: string]: unknown;
};
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
// NOTE: mock.module is global across the test process and the last registration
// for a module path wins. Other source files import additional fs names at
// module-eval time, so we expose the full surface to avoid link errors when
// files run together.
mock.module("node:fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mock(() => {}),
  writeFileSync: mock(() => {}),
  unlinkSync: mock(() => {}),
  rmSync: mock(() => {}),
  readdirSync: mock(() => [] as string[]),
  statSync: mock(() => ({ isDirectory: () => false })),
  copyFileSync: mock(() => {}),
}));

// --- load-env mock ---------------------------------------------------------
const loadEnvCalls: Array<[string, string]> = [];
const mockLoadEnv = mock((env: string, cwd: string) => {
  loadEnvCalls.push([env, cwd]);
});
mock.module("@damatjs/load-env", () => ({ loadEnv: mockLoadEnv }));

const { startCommand } = (await import("../start")) as {
  startCommand: Command;
};

const CWD = "/project";
const savedNodeEnv = process.env.NODE_ENV;

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Bun as any).spawn = originalSpawn;
});

function resetMocks() {
  spawnCalls.length = 0;
  loadEnvCalls.length = 0;
  spawnExitCode = 0;
  existsMap = {};
  existsDefault = false;
  mockExistsSync.mockClear();
  mockLoadEnv.mockClear();
  delete process.env.NODE_ENV;
}

beforeEach(resetMocks);
afterEach(() => {
  resetMocks();
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
});

describe("startCommand.handler", () => {
  it("errors and returns exit code 1 when the build entry is missing", async () => {
    existsDefault = false; // entry.js does not exist
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
    existsDefault = false;
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(mockExistsSync).toHaveBeenCalledWith(
      "/project/.damat/dist/entry.js",
    );
  });

  it("spawns `bun run <entry>` from ctx.cwd when the build exists", async () => {
    existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    const result = await startCommand.handler(ctx);

    expect(result.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0]!;
    expect(call.cwd).toBe(CWD);
    expect(call.cmd).toEqual(["bun", "run", "/project/.damat/dist/entry.js"]);
  });

  it("loads env with 'production' default and process.cwd()", async () => {
    delete process.env.NODE_ENV;
    existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(loadEnvCalls).toHaveLength(1);
    expect(loadEnvCalls[0]![0]).toBe("production");
    expect(loadEnvCalls[0]![1]).toBe(process.cwd());
  });

  it("loads env with the value of NODE_ENV when set", async () => {
    process.env.NODE_ENV = "production-eu";
    existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(loadEnvCalls[0]![0]).toBe("production-eu");
  });

  it("respects a custom output directory", async () => {
    existsMap = { "/project/build/entry.js": true };
    const { ctx } = createContext({ output: "build" }, { cwd: CWD });

    await startCommand.handler(ctx);

    expect(mockExistsSync).toHaveBeenCalledWith("/project/build/entry.js");
    expect(spawnCalls[0]!.cmd).toContain("/project/build/entry.js");
  });

  it("returns the subprocess exit code on the happy path", async () => {
    spawnExitCode = 3;
    existsMap = { "/project/.damat/dist/entry.js": true };
    const { ctx } = createContext({ output: ".damat/dist" }, { cwd: CWD });

    const result = await startCommand.handler(ctx);
    expect(result.exitCode).toBe(3);
  });
});
