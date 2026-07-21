import { beforeEach, describe, expect, it, mock } from "bun:test";
import { createContext } from "../helpers";
import {
  appendCalls,
  cpCalls,
  loadEnvCalls,
  mockExistsSync,
  mockMkdirSync,
  mockReaddirSync,
  mockSpawnSync,
  mockStatSync,
  mockWriteFileSync,
  resetMocks,
  rmCalls,
  spawnCalls,
  spawnSyncCalls,
  state as fsState,
  unlinkCalls,
  writeCalls,
} from "../setup";
import { mm, resetHandlerFixture } from "./fixture";

export const resetContext = resetHandlerFixture;

export function mockStatSyncForLinks(): void {
  mockStatSync.mockImplementation((path) => ({
    isDirectory: () =>
      String(path).endsWith("/user") || String(path).endsWith("models"),
  }));
}

export function baseLocalInstall(extra: Record<string, boolean> = {}): void {
  fsState.existsMap = {
    "/pkg": true,
    "/pkg/src/api/routes": false,
    "/pkg/src/workflows": false,
    "/pkg/src/links": false,
    "/pkg/tests": false,
    "/app/src/modules/user": false,
    "/app/damat.config.ts": true,
    "/app/tsconfig.json": true,
    "/app/.env.example": false,
    "/app/.env": false,
    "/pkg/package.json": false,
    ...extra,
  };
  fsState.readFileMap = {
    "/app/damat.config.ts":
      "export default defineConfig({\n  modules: {},\n});\n",
    "/app/tsconfig.json": JSON.stringify({}),
  };
  mm.locateResult = "/pkg/src";
}

export async function withVerifyPolicy<T>(
  value: string | undefined,
  action: () => Promise<T>,
): Promise<T> {
  const previous = process.env.DAMAT_MODULE_VERIFY;
  if (value === undefined) delete process.env.DAMAT_MODULE_VERIFY;
  else process.env.DAMAT_MODULE_VERIFY = value;
  try {
    return await action();
  } finally {
    if (previous === undefined) delete process.env.DAMAT_MODULE_VERIFY;
    else process.env.DAMAT_MODULE_VERIFY = previous;
  }
}

export {
  appendCalls,
  beforeEach,
  cpCalls,
  createContext,
  describe,
  expect,
  fsState,
  it,
  loadEnvCalls,
  mm,
  mock,
  mockExistsSync,
  mockMkdirSync,
  mockReaddirSync,
  mockSpawnSync,
  mockStatSync,
  mockWriteFileSync,
  resetMocks,
  rmCalls,
  spawnCalls,
  spawnSyncCalls,
  unlinkCalls,
  writeCalls,
};
