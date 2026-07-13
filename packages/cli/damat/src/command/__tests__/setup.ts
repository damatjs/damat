/**
 * Shared test setup for the command handler tests (build / dev / start), plus
 * the registration test.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * The command sources (`../build`, `../dev`, `../start`) do
 *   `import { spawn } from "bun"`            // snapshots Bun.spawn
 *   `import { ... } from "node:fs"`          // snapshots the fs exports
 * at MODULE-EVALUATION time. Whatever `Bun.spawn` / `node:fs` look like the
 * first time a source is imported is what that source keeps forever.
 *
 * Previously each test file installed its OWN fake by reassigning `Bun.spawn`
 * and registering its OWN `mock.module("node:fs", ...)`, then dynamically
 * importing its source. That only works if that file is the FIRST to import
 * its source. When `bun test packages/cli/damat` runs all four files in one
 * process, `registration.test.ts` (which imports the sources directly with NO
 * fakes) or a sibling file could evaluate a source before its own fake was in
 * place — snapshotting the REAL `Bun.spawn` (→ `ENOENT: posix_spawn 'bun'`) and
 * a PARTIAL `node:fs` mock missing `renameSync`/`appendFileSync` that
 * `@damatjs/logger`'s file transport statically imports (→ "Export named
 * 'renameSync' not found in module 'node:fs'").
 *
 * THE FIX: DISPATCHER + SHARED MUTABLE STATE, IMPORTED FIRST
 * ---------------------------------------------------------
 * This module installs the global fakes EXACTLY ONCE, at module-load time,
 * BEFORE any command source is imported by any test file. Every test file
 * imports this module FIRST, so the sources snapshot:
 *   - a STABLE `Bun.spawn` dispatcher that forwards to a mutable handler, and
 *   - a single `node:fs` mock built by spreading the genuine real fs surface
 *     (so sibling modules keep linking) and overriding the fns tests observe.
 * Per-test behaviour is then controlled by MUTATING shared state (never by
 * reassigning `Bun.spawn` or re-registering the mock), so it doesn't matter
 * which file evaluated a source first — the dispatcher/mock are already there.
 */
import { mock } from "bun:test";
import { fakeSpawnResult } from "./helpers";

// ---------------------------------------------------------------------------
// Capture the REAL node:fs surface BEFORE installing any mock. This module is
// the first to register a `node:fs` mock (every test file imports it first), so
// these are the genuine exports. Spreading them into the mock factory keeps
// names like renameSync/appendFileSync linkable for @damatjs/logger.
// ---------------------------------------------------------------------------
import * as nodeFs from "node:fs";
const realFs = { ...nodeFs };

// ---------------------------------------------------------------------------
// Shared mutable state. Tests mutate these between cases; the dispatcher and
// mock fns read them, so a source snapshotting the dispatcher/mock at import
// time still observes per-test configuration.
// ---------------------------------------------------------------------------
type SpawnCall = {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string>;
  [k: string]: unknown;
};

export const state: {
  existsMap: Record<string, boolean>;
  existsDefault: boolean;
  spawnExitCode: number;
  // copyDir() in build.ts walks a directory: readdir returns entry names and
  // statSync tells it whether each entry is a directory. build.test wants a
  // single non-dir file ("app.ts"); dev/start never copy so the value is moot.
  readdirResult: string[];
  statIsDirectory: boolean;
  // readFileSync(path) → readFileMap[path] (falls back to "" so a handler that
  // reads an unexpected path doesn't hit the real filesystem). Tests that need
  // path-specific content set entries here; others ignore it.
  readFileMap: Record<string, string>;
  // Result returned by the mocked node:child_process.spawnSync (git clone / bun
  // add). Defaults to a clean success.
  spawnSyncResult: {
    status: number | null;
    stdout?: string;
    stderr?: string;
  };
} = {
  existsMap: {},
  existsDefault: false,
  spawnExitCode: 0,
  readdirResult: ["app.ts"],
  statIsDirectory: false,
  readFileMap: {},
  spawnSyncResult: { status: 0, stdout: "", stderr: "" },
};

// ---------------------------------------------------------------------------
// Bun.spawn dispatcher. Sources snapshot THIS function; per-test behaviour is
// driven by `currentSpawnHandler` + `state.spawnExitCode`, not by reassignment.
// ---------------------------------------------------------------------------
export const spawnCalls: SpawnCall[] = [];

let currentSpawnHandler: (opts: SpawnCall) => { exited: Promise<number> } = (
  opts,
) => {
  spawnCalls.push(opts);
  return fakeSpawnResult(state.spawnExitCode);
};

/** Override how spawn behaves for a single test (rarely needed). */
export function setSpawnHandler(
  handler: (opts: SpawnCall) => { exited: Promise<number> },
) {
  currentSpawnHandler = handler;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Bun as any).spawn = (opts: SpawnCall) => currentSpawnHandler(opts);

// ---------------------------------------------------------------------------
// node:fs mock fns. Each reads shared state and/or records calls.
// ---------------------------------------------------------------------------
export const writeCalls: Array<{ path: string; content: string }> = [];
export const unlinkCalls: string[] = [];
export const rmCalls: Array<{ path: string; opts?: unknown }> = [];
export const copyCalls: Array<{ src: string; dest: string }> = [];
// `cpSync` (recursive tree copy) + `appendFileSync` are used by the module
// install helpers (copy.ts / env.ts). Mock them so those helpers never touch a
// real filesystem; tests assert against these recordings.
export const cpCalls: Array<{ src: string; dest: string; opts?: unknown }> = [];
export const appendCalls: Array<{ path: string; content: string }> = [];

export const mockExistsSync = mock(
  (p: string) => state.existsMap[p] ?? state.existsDefault,
);
export const mockMkdirSync = mock((_p: string, _o?: unknown) => {});
export const mockWriteFileSync = mock((p: string, content: string) => {
  writeCalls.push({ path: p, content });
});
export const mockUnlinkSync = mock((p: string) => {
  unlinkCalls.push(p);
});
export const mockRmSync = mock((p: string, opts?: unknown) => {
  rmCalls.push({ path: p, opts });
});
export const mockReaddirSync = mock(
  (_p: string, _o?: unknown) => state.readdirResult,
);
export const mockReadFileSync = mock(
  (p: string, _enc?: unknown) => state.readFileMap[p as string] ?? "",
);
export const mockStatSync = mock((_p: string) => ({
  isDirectory: () => state.statIsDirectory,
}));
// `lstatSync` is used by the kit planner (plan.ts) so hostile symlinks are
// never followed. Default: a plain file/dir per state, never a symlink.
export const mockLstatSync = mock((_p: string) => ({
  isDirectory: () => state.statIsDirectory,
  isSymbolicLink: () => false,
}));
export const mockCopyFileSync = mock((src: string, dest: string) => {
  copyCalls.push({ src, dest });
});
export const mockCpSync = mock((src: string, dest: string, opts?: unknown) => {
  cpCalls.push({ src, dest, opts });
});
export const mockAppendFileSync = mock((p: string, content: string) => {
  appendCalls.push({ path: p, content });
});
// `mkdtempSync(prefix)` is used by source.ts to make a clone dir. Return a
// deterministic fake path so no real temp dir is created.
export const mockMkdtempSync = mock((prefix: string) => `${prefix}XXXXXX`);

// Spread the genuine real fs first so EVERY export (renameSync, appendFileSync,
// …) stays linkable for sibling modules like @damatjs/logger, then override the
// specific fns the command tests need to observe/record.
mock.module("node:fs", () => ({
  ...realFs,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync,
  rmSync: mockRmSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  lstatSync: mockLstatSync,
  copyFileSync: mockCopyFileSync,
  readFileSync: mockReadFileSync,
  cpSync: mockCpSync,
  appendFileSync: mockAppendFileSync,
  mkdtempSync: mockMkdtempSync,
}));

// ---------------------------------------------------------------------------
// node:child_process mock. The install helpers (source.ts clone, packages.ts
// `bun add`) shell out via spawnSync; replace it with a controllable stub so no
// real git/bun process ever runs. Spread the real module so other exports stay
// linkable. `state.spawnSyncResult` drives status/stdout/stderr per test.
// ---------------------------------------------------------------------------
import * as nodeChildProcess from "node:child_process";
const realChildProcess = { ...nodeChildProcess };
export const spawnSyncCalls: Array<{
  cmd: string;
  args: string[];
  opts?: unknown;
}> = [];
export const mockSpawnSync = mock(
  (cmd: string, args: string[], opts?: unknown) => {
    spawnSyncCalls.push({ cmd, args, opts });
    return state.spawnSyncResult;
  },
);
mock.module("node:child_process", () => ({
  ...realChildProcess,
  spawnSync: mockSpawnSync,
}));

// ---------------------------------------------------------------------------
// @damatjs/load-env mock. dev/start call loadEnv(env, cwd).
// ---------------------------------------------------------------------------
export const loadEnvCalls: Array<[string, string]> = [];
export const mockLoadEnv = mock((env: string, cwd: string) => {
  loadEnvCalls.push([env, cwd]);
});
mock.module("@damatjs/load-env", () => ({ loadEnv: mockLoadEnv }));

// ---------------------------------------------------------------------------
// Reset helpers. Call resetMocks() in beforeEach/afterEach.
// ---------------------------------------------------------------------------
/** Reset only the mutable state back to defaults (not the recording arrays). */
export function resetSetup() {
  state.existsMap = {};
  state.existsDefault = false;
  state.spawnExitCode = 0;
  state.readdirResult = ["app.ts"];
  state.statIsDirectory = false;
  state.readFileMap = {};
  state.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
}

/** Clear recording arrays, reset state, and clear every mock fn's call log. */
export function resetMocks() {
  spawnCalls.length = 0;
  writeCalls.length = 0;
  unlinkCalls.length = 0;
  rmCalls.length = 0;
  copyCalls.length = 0;
  cpCalls.length = 0;
  appendCalls.length = 0;
  spawnSyncCalls.length = 0;
  loadEnvCalls.length = 0;
  resetSetup();
  mockExistsSync.mockClear();
  // A test may have replaced the existsSync implementation (e.g. source.ts git
  // tests); restore the state-driven default so siblings see clean behaviour.
  mockExistsSync.mockImplementation(
    (p: string) => state.existsMap[p] ?? state.existsDefault,
  );
  mockMkdirSync.mockClear();
  mockWriteFileSync.mockClear();
  mockUnlinkSync.mockClear();
  mockRmSync.mockClear();
  mockReaddirSync.mockClear();
  mockReaddirSync.mockReset();
  mockReaddirSync.mockImplementation(
    (_p: string, _o?: unknown) => state.readdirResult,
  );
  mockReadFileSync.mockClear();
  mockReadFileSync.mockReset();
  mockReadFileSync.mockImplementation(
    (p: string, _enc?: unknown) => state.readFileMap[p as string] ?? "",
  );
  mockStatSync.mockClear();
  mockStatSync.mockReset();
  mockStatSync.mockImplementation((_p: string) => ({
    isDirectory: () => state.statIsDirectory,
  }));
  mockLstatSync.mockClear();
  mockLstatSync.mockReset();
  mockLstatSync.mockImplementation((_p: string) => ({
    isDirectory: () => state.statIsDirectory,
    isSymbolicLink: () => false,
  }));
  mockCopyFileSync.mockClear();
  mockCpSync.mockClear();
  mockAppendFileSync.mockClear();
  mockMkdtempSync.mockClear();
  mockSpawnSync.mockClear();
  mockLoadEnv.mockClear();
}
