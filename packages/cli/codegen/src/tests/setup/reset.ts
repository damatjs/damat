import {
  appendCalls,
  copyCalls,
  cpCalls,
  rmCalls,
  unlinkCalls,
  writeCalls,
} from "./fsState";
import {
  mockAppendFileSync,
  mockCopyFileSync,
  mockCpSync,
  mockExistsSync,
  mockLstatSync,
  mockMkdirSync,
  mockMkdtempSync,
  mockReadFileSync,
  mockReaddirSync,
  mockRmSync,
  mockStatSync,
  mockUnlinkSync,
  mockWriteFileSync,
} from "./fsMocks";
import { loadEnvCalls, mockLoadEnv } from "./env";
import { mockSpawnSync, spawnSyncCalls } from "./process";
import { spawnCalls } from "./spawn";
import { resetSetup, state } from "./state";

export function resetMocks(): void {
  for (const calls of [
    spawnCalls,
    writeCalls,
    unlinkCalls,
    rmCalls,
    copyCalls,
    cpCalls,
    appendCalls,
    spawnSyncCalls,
    loadEnvCalls,
  ])
    calls.length = 0;
  resetSetup();
  mockExistsSync.mockClear();
  mockExistsSync.mockImplementation(
    (path: string) => state.existsMap[path] ?? state.existsDefault,
  );
  for (const fn of [
    mockMkdirSync,
    mockWriteFileSync,
    mockUnlinkSync,
    mockRmSync,
    mockCopyFileSync,
    mockCpSync,
    mockAppendFileSync,
    mockMkdtempSync,
    mockSpawnSync,
    mockLoadEnv,
  ])
    fn.mockClear();
  mockReaddirSync.mockReset();
  mockReaddirSync.mockImplementation(
    (_path: string, _options?: unknown) => state.readdirResult,
  );
  mockReadFileSync.mockReset();
  mockReadFileSync.mockImplementation(
    (path: string, _encoding?: unknown) => state.readFileMap[path] ?? "",
  );
  mockStatSync.mockReset();
  mockStatSync.mockImplementation((_path: string) => ({
    isDirectory: () => state.statIsDirectory,
  }));
  mockLstatSync.mockReset();
  mockLstatSync.mockImplementation((_path: string) => ({
    isDirectory: () => state.statIsDirectory,
    isSymbolicLink: () => false,
  }));
}
