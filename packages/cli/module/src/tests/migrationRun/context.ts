import { resetMocks } from "../setup";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createContext } from "../helpers";

import * as realModule from "@damatjs/module";

const mm = {
  result: {} as Awaited<ReturnType<typeof realModule.runModuleMigration>>,
  calls: [] as string[],
  throws: null as Error | null,
};

mock.module("@damatjs/module", () => ({
  ...realModule,
  runModuleMigration: async (packageDir: string) => {
    mm.calls.push(packageDir);
    if (mm.throws) throw mm.throws;
    return mm.result;
  },
}));

async function getCmd() {
  return (await import("../../commands/module/migrationRun"))
    .moduleMigrationRunCommand;
}

const ORIGINAL_DB_URL = process.env.DATABASE_URL;
export function resetContext(): void {
  resetMocks();
  mm.calls = [];
  mm.throws = null;
  mm.result = {
    moduleName: "demo",
    applied: [],
    pending: [],
    success: true,
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
  mm,
  getCmd,
  ORIGINAL_DB_URL,
};
