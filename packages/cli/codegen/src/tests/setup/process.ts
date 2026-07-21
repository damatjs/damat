import { mock } from "bun:test";
import * as nodeChildProcess from "node:child_process";
import { state } from "./state";

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
