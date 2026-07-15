import {
  cpCalls,
  mockLstatSync,
  mockMkdirSync,
  mockReaddirSync,
  mockSpawnSync,
  resetMocks,
  rmCalls,
  spawnSyncCalls,
  state as fsState,
  writeCalls,
} from "./setup";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createContext } from "./helpers";
import { KIT_MANIFEST_FILENAME } from "../commands/kit/manifest";
export { describe, it, expect, beforeEach, afterEach } from "bun:test";
export { join, resolve, createContext, fsState, writeCalls, rmCalls, cpCalls };
export { spawnSyncCalls, mockSpawnSync, mockMkdirSync };
export const TMP = join(tmpdir(), "damat-kit-XXXXXX");

export const fixtures = {
  readdir: {} as Record<string, string[]>,
  directory: {} as Record<string, boolean>,
  symlink: {} as Record<string, boolean>,
};

const spawnDefault = (cmd: string, args: string[], opts?: unknown) => {
  spawnSyncCalls.push({ cmd, args, opts });
  return fsState.spawnSyncResult;
};

export function resetKitTests() {
  resetMocks();
  fixtures.readdir = {};
  fixtures.directory = {};
  fixtures.symlink = {};
  mockReaddirSync.mockImplementation(
    (path) => fixtures.readdir[path] ?? fsState.readdirResult,
  );
  mockLstatSync.mockImplementation((path) => ({
    isDirectory: () => fixtures.directory[path] ?? fsState.statIsDirectory,
    isSymbolicLink: () => fixtures.symlink[path] ?? false,
  }));
  mockSpawnSync.mockImplementation(spawnDefault);
}

export function stageLocalKit(directory: string, manifest: unknown) {
  fsState.existsMap[directory] = true;
  const path = join(directory, KIT_MANIFEST_FILENAME);
  fsState.existsMap[path] = true;
  fsState.readFileMap[path] = JSON.stringify(manifest);
}

export function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    name: "design-kit",
    mappings: [{ from: "**", to: "src/kit" }],
    ...overrides,
  };
}

export {
  KIT_MANIFEST_FILENAME,
  readKitManifest,
  kitManifestErrors,
  targetPathError,
} from "../commands/kit/manifest";
export type { KitManifest } from "../commands/kit/manifest";
export { buildKitPlan, globToRegExp, staticPrefix } from "../commands/kit/plan";
export { resolveKitSource } from "../commands/kit/source";
export { kitAddCommand, KIT_RECORD_FILENAME } from "../commands/kit/add";
export { kitInitCommand } from "../commands/kit/init";
export { kitValidateCommand } from "../commands/kit/validate";
export { kitCommand } from "../commands/kit";
