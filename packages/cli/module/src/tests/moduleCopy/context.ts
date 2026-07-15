import {
  state as fsState,
  cpCalls,
  rmCalls,
  writeCalls,
  resetMocks,
  mockReaddirSync,
  mockStatSync,
  mockMkdirSync,
} from "../setup";
import { describe, it, expect, beforeEach } from "bun:test";
import { sep } from "node:path";

export const maps = {
  readdir: {} as Record<string, string[]>,
  statDir: {} as Record<string, boolean>,
};
export function resetContext(): void {
  resetMocks();
  maps.readdir = {};
  maps.statDir = {};
  mockReaddirSync.mockImplementation((path) => maps.readdir[path] ?? []);
  mockStatSync.mockImplementation((path) => ({
    isDirectory: () => maps.statDir[path] ?? false,
  }));
}
export {
  fsState,
  cpCalls,
  rmCalls,
  writeCalls,
  resetMocks,
  mockReaddirSync,
  mockStatSync,
  mockMkdirSync,
  describe,
  it,
  expect,
  beforeEach,
  sep,
};
