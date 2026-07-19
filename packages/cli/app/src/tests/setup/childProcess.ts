import { mock } from "bun:test";
import * as childProcess from "node:child_process";
import { state } from "./state";

export const spawnSyncCalls: Array<{
  cmd: string;
  args: string[];
  opts?: unknown;
}> = [];

export const mockSpawnSync = mock(
  (cmd: string, args: string[], opts?: unknown) => {
    spawnSyncCalls.push({ cmd, args, opts });
    return state.spawnSyncResults.shift() ?? state.spawnSyncResult;
  },
);

mock.module("node:child_process", () => ({
  ...childProcess,
  spawnSync: mockSpawnSync,
}));
