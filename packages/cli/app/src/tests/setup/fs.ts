import { mock } from "bun:test";
import * as nodeFs from "node:fs";
import { state } from "./state";

export const writeCalls: Array<{ path: string; content: string }> = [];
export const unlinkCalls: string[] = [];
export const rmCalls: Array<{ path: string; opts?: unknown }> = [];
export const copyCalls: Array<{ src: string; dest: string }> = [];
export const cpCalls: Array<{ src: string; dest: string; opts?: unknown }> = [];

export const mockExistsSync = mock(
  (path: string) => state.existsMap[path] ?? state.existsDefault,
);
export const mockMkdirSync = mock((_path: string, _options?: unknown) => {});
export const mockWriteFileSync = mock((path: string, content: string) => {
  writeCalls.push({ path, content });
});
export const mockUnlinkSync = mock((path: string) => unlinkCalls.push(path));
export const mockRmSync = mock((path: string, opts?: unknown) => {
  rmCalls.push({ path, opts });
});
export const mockReaddirSync = mock(
  (_path: string, _options?: unknown) => state.readdirResult,
);
export const mockReadFileSync = mock(
  (path: string, _encoding?: unknown) => state.readFileMap[path] ?? "",
);
export const mockStatSync = mock((_path: string) => ({
  isDirectory: () => state.statIsDirectory,
}));
export const mockCopyFileSync = mock((src: string, dest: string) => {
  copyCalls.push({ src, dest });
});
export const mockCpSync = mock((src: string, dest: string, opts?: unknown) => {
  cpCalls.push({ src, dest, opts });
});
export const mockMkdtempSync = mock((prefix: string) => `${prefix}XXXXXX`);

mock.module("node:fs", () => ({
  ...nodeFs,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync,
  rmSync: mockRmSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
  statSync: mockStatSync,
  copyFileSync: mockCopyFileSync,
  cpSync: mockCpSync,
  mkdtempSync: mockMkdtempSync,
}));
