import { mock } from "bun:test";
import * as fs from "node:fs";
import * as childProcess from "node:child_process";

export const state = {
  exists: false,
  unlinkError: undefined as Error | undefined,
  spawnExitCode: 0,
  spawnError: false,
  spawnSyncResult: { status: 0, stdout: "", stderr: "" } as {
    status: number | null;
    stdout?: string;
    stderr?: string;
    error?: Error;
  },
};
export const unlinkCalls: string[] = [];
export const spawnCalls: Array<{ cmd: string[]; cwd?: string }> = [];
export const spawnSyncCalls: Array<{ cmd: string; args: string[] }> = [];

export const mockUnlinkSync = mock((path: string) => {
  if (state.unlinkError) throw state.unlinkError;
  unlinkCalls.push(path);
});
mock.module("node:fs", () => ({
  ...fs,
  existsSync: () => state.exists,
  unlinkSync: mockUnlinkSync,
}));

export const mockSpawnSync = mock((cmd: string, args: string[]) => {
  spawnSyncCalls.push({ cmd, args });
  return state.spawnSyncResult;
});
mock.module("node:child_process", () => ({
  ...childProcess,
  spawnSync: mockSpawnSync,
}));

(
  Bun as unknown as {
    spawn: (opts: { cmd: string[]; cwd?: string }) => unknown;
  }
).spawn = (opts) => {
  if (state.spawnError) throw new Error("spawn failed");
  spawnCalls.push(opts);
  return { exited: Promise.resolve(state.spawnExitCode) };
};

export function resetSupportMocks(): void {
  state.exists = false;
  state.unlinkError = undefined;
  state.spawnExitCode = 0;
  state.spawnError = false;
  state.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
  unlinkCalls.length = 0;
  spawnCalls.length = 0;
  spawnSyncCalls.length = 0;
  mockUnlinkSync.mockClear();
  mockSpawnSync.mockClear();
}
