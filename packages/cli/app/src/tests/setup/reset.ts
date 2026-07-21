import {
  copyCalls,
  cpCalls,
  mockCopyFileSync,
  mockCpSync,
  mockExistsSync,
  mockMkdirSync,
  mockMkdtempSync,
  mockReadFileSync,
  mockReaddirSync,
  mockRmSync,
  mockStatSync,
  mockUnlinkSync,
  mockWriteFileSync,
  rmCalls,
  unlinkCalls,
  writeCalls,
} from "./fs";
import { mockSpawnSync, spawnSyncCalls } from "./childProcess";
import { loadEnvCalls, mockLoadEnv } from "./env";
import { resetSpawn } from "./spawn";
import { resetState, state } from "./state";

export function resetMocks() {
  resetState();
  resetSpawn();
  writeCalls.length = 0;
  unlinkCalls.length = 0;
  rmCalls.length = 0;
  copyCalls.length = 0;
  cpCalls.length = 0;
  spawnSyncCalls.length = 0;
  loadEnvCalls.length = 0;
  mockExistsSync.mockReset();
  mockExistsSync.mockImplementation(
    (path) => state.existsMap[path] ?? state.existsDefault,
  );
  mockMkdirSync.mockClear();
  mockWriteFileSync.mockClear();
  mockUnlinkSync.mockClear();
  mockRmSync.mockClear();
  mockReaddirSync.mockReset();
  mockReaddirSync.mockImplementation(() => state.readdirResult);
  mockReadFileSync.mockReset();
  mockReadFileSync.mockImplementation((path) => state.readFileMap[path] ?? "");
  mockStatSync.mockReset();
  mockStatSync.mockImplementation(() => ({
    isDirectory: () => state.statIsDirectory,
  }));
  mockCopyFileSync.mockClear();
  mockCpSync.mockClear();
  mockMkdtempSync.mockClear();
  mockSpawnSync.mockClear();
  mockLoadEnv.mockClear();
}
