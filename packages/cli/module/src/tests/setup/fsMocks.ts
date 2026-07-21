import { mock } from "bun:test";
import * as nodeFs from "node:fs";
import { state } from "./state";
import {
  appendCalls,
  copyCalls,
  cpCalls,
  rmCalls,
  unlinkCalls,
  writeCalls,
} from "./fsState";

const realFs = { ...nodeFs };
export const mockExistsSync = mock(
  (path: string) => state.existsMap[path] ?? state.existsDefault,
);
export const mockMkdirSync = mock((_path: string, _options?: unknown) => {});
export const mockWriteFileSync = mock((path: string, content: string) => {
  writeCalls.push({ path, content });
  state.readFileMap[path] = content;
  state.existsMap[path] = true;
});
export const mockUnlinkSync = mock((path: string) => unlinkCalls.push(path));
export const mockRmSync = mock((path: string, opts?: unknown) =>
  rmCalls.push({ path, opts }),
);
export const mockReaddirSync = mock(
  (_path: string, _options?: unknown) => state.readdirResult,
);
export const mockReadFileSync = mock(
  (path: string, _encoding?: unknown) => state.readFileMap[path] ?? "",
);
export const mockStatSync = mock((_path: string) => ({
  isDirectory: () => state.statIsDirectory,
}));
export const mockLstatSync = mock((_path: string) => ({
  isDirectory: () => state.statIsDirectory,
  isSymbolicLink: () => false,
}));
export const mockCopyFileSync = mock((src: string, dest: string) =>
  copyCalls.push({ src, dest }),
);
export const mockCpSync = mock((src: string, dest: string, opts?: unknown) =>
  cpCalls.push({ src, dest, opts }),
);
export const mockAppendFileSync = mock((path: string, content: string) =>
  appendCalls.push({ path, content }),
);
export const mockMkdtempSync = mock((prefix: string) => `${prefix}XXXXXX`);

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
