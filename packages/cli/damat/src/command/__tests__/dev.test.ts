import {
  describe,
  it,
  expect,
  mock,
  spyOn,
  beforeEach,
  afterEach,
  afterAll,
} from "bun:test";
import { createContext, fakeSpawnResult } from "./helpers";
import type { Command } from "@damatjs/cli";

/**
 * dev.handler writes a temp entry file, optionally clears the console, loads
 * env vars and spawns `bun --watch`. We replace `Bun.spawn` with a recording
 * fake before importing the source (see build.test.ts for why mock.module on
 * "bun" does not work), and mock node:fs + @damatjs/load-env via mock.module.
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
const mockMkdirSync = mock((_p: string, _o?: unknown) => {});
const writeCalls: Array<{ path: string; content: string }> = [];
const mockWriteFileSync = mock((p: string, content: string) => {
  writeCalls.push({ path: p, content });
});
const unlinkCalls: string[] = [];
const mockUnlinkSync = mock((p: string) => {
  unlinkCalls.push(p);
});
// NOTE: mock.module is global across the test process and the last registration
// for a module path wins. Other source files (build.ts) import additional fs
// names at module-eval time, so we expose the full surface to avoid
// "Export named '...' not found" link errors when files run together.
mock.module("node:fs", () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync,
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

const { devCommand } = (await import("../dev")) as { devCommand: Command };

const CWD = "/project";
let clearSpy: ReturnType<typeof spyOn>;

// Preserve/restore the process.env values we mutate.
const savedNodeEnv = process.env.NODE_ENV;
const savedPort = process.env.PORT;

afterAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Bun as any).spawn = originalSpawn;
});

function resetMocks() {
  spawnCalls.length = 0;
  writeCalls.length = 0;
  unlinkCalls.length = 0;
  loadEnvCalls.length = 0;
  spawnExitCode = 0;
  existsMap = {};
  existsDefault = false;
  mockExistsSync.mockClear();
  mockMkdirSync.mockClear();
  mockWriteFileSync.mockClear();
  mockUnlinkSync.mockClear();
  mockLoadEnv.mockClear();
  delete process.env.PORT;
  delete process.env.NODE_ENV;
}

beforeEach(() => {
  resetMocks();
  clearSpy = spyOn(console, "clear").mockImplementation(() => {});
});

afterEach(() => {
  clearSpy.mockRestore();
  if (savedNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = savedNodeEnv;
  if (savedPort === undefined) delete process.env.PORT;
  else process.env.PORT = savedPort;
});

describe("devCommand.handler", () => {
  it("writes the dev-entry temp file with framework runEntry content", async () => {
    existsDefault = false;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    const write = writeCalls.find((w) =>
      w.path.endsWith("/.damat/dev-entry.ts"),
    );
    expect(write).toBeDefined();
    expect(write!.content).toBe(
      `import { runEntry } from '@damatjs/framework/entry';\nrunEntry();\n`,
    );
  });

  it("creates the .damat dir when missing", async () => {
    existsDefault = false;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(mockMkdirSync).toHaveBeenCalledWith("/project/.damat", {
      recursive: true,
    });
  });

  it("does not clear the console when clear is false", async () => {
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });
    await devCommand.handler(ctx);
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it("clears the console when clear is true", async () => {
    const { ctx } = createContext({ port: 3000, clear: true }, { cwd: CWD });
    await devCommand.handler(ctx);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it("loads env with 'development' default and process.cwd()", async () => {
    delete process.env.NODE_ENV;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(loadEnvCalls).toHaveLength(1);
    expect(loadEnvCalls[0]![0]).toBe("development");
    expect(loadEnvCalls[0]![1]).toBe(process.cwd());
  });

  it("loads env with the value of NODE_ENV when set", async () => {
    process.env.NODE_ENV = "staging";
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(loadEnvCalls[0]![0]).toBe("staging");
  });

  it("spawns `bun --watch --no-clear-screen <entry>` from ctx.cwd", async () => {
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(spawnCalls).toHaveLength(1);
    const call = spawnCalls[0]!;
    expect(call.cwd).toBe(CWD);
    expect(call.cmd).toEqual([
      "bun",
      "--watch",
      "--no-clear-screen",
      "/project/.damat/dev-entry.ts",
    ]);
  });

  it("uses the port option for PORT when process.env.PORT is unset", async () => {
    delete process.env.PORT;
    const { ctx } = createContext({ port: 4321, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(spawnCalls[0]!.env!.PORT).toBe("4321");
  });

  it("prefers an existing process.env.PORT over the port option", async () => {
    process.env.PORT = "9999";
    const { ctx } = createContext({ port: 4321, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(spawnCalls[0]!.env!.PORT).toBe("9999");
  });

  it("removes the temp entry file after the process exits", async () => {
    existsMap = { "/project/.damat/dev-entry.ts": true };
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    await devCommand.handler(ctx);

    expect(unlinkCalls).toContain("/project/.damat/dev-entry.ts");
  });

  it("returns the subprocess exit code", async () => {
    spawnExitCode = 7;
    const { ctx } = createContext({ port: 3000, clear: false }, { cwd: CWD });

    const result = await devCommand.handler(ctx);
    expect(result.exitCode).toBe(7);
  });
});
