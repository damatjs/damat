import { resetMocks } from "../setup";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createContext } from "../helpers";

import * as realModule from "@damatjs/module";

const ms = {
  result: {} as Awaited<ReturnType<typeof realModule.runModuleMigrationStatus>>,
  calls: [] as string[],
  throws: null as Error | null,
};

mock.module("@damatjs/module", () => ({
  ...realModule,
  runModuleMigrationStatus: async (packageDir: string) => {
    ms.calls.push(packageDir);
    if (ms.throws) throw ms.throws;
    return ms.result;
  },
}));

async function getCmd() {
  return (await import("../../commands/module/migrationStatus"))
    .moduleMigrationStatusCommand;
}

const ORIGINAL_DB_URL = process.env.DATABASE_URL;
export function resetContext(): void {
  resetMocks();
  ms.calls = [];
  ms.throws = null;
  ms.result = {
    moduleName: "demo",
    applied: 0,
    pending: 0,
    migrations: [],
    hadMigrations: true,
  };
  delete process.env.DATABASE_URL;
}

export function cleanupContext(): void {
  if (ORIGINAL_DB_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DB_URL;
}
export {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  afterEach,
  createContext,
  realModule,
  ms,
  getCmd,
  ORIGINAL_DB_URL,
};
