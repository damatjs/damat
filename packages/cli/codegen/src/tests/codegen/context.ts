import { describe, it, expect, mock, beforeEach } from "bun:test";
import { resetMocks, state as fsState } from "../setup";
import { createContext } from "../helpers";

import * as realCodegen from "@damatjs/codegen";
import * as realOrmCli from "@damatjs/orm-cli";

type ModuleEntry = { resolve: string; kind?: string };

const cg = {
  modules: {} as Record<string, ModuleEntry>,
  loadThrows: null as Error | null,
  runThrows: null as Error | null,
  runArgs: null as any,

  runArgsList: [] as any[],
  barrelCalls: [] as any[],
  barrelWritten: [] as string[],
  barrelThrows: null as Error | null,
  runResult: {
    outputDir: "",
    files: [] as string[],
    scaffolded: [] as string[],
  },
};

mock.module("@damatjs/orm-cli", () => ({
  ...realOrmCli,
  loadModules: async () => {
    if (cg.loadThrows) throw cg.loadThrows;
    return cg.modules;
  },
}));
mock.module("@damatjs/codegen", () => ({
  ...realCodegen,
  runCodegen: async (opts: any) => {
    cg.runArgs = opts;
    cg.runArgsList.push(opts);

    if (typeof opts.augmentFilesMap === "function") {
      await opts.augmentFilesMap(new Map<string, string>());
    }

    if (cg.runThrows) throw cg.runThrows;
    return cg.runResult;
  },

  generateBarrels: (...args: any[]) => {
    cg.barrelCalls.push(args);
    if (cg.barrelThrows) throw cg.barrelThrows;
    return { written: cg.barrelWritten };
  },
}));

async function getCmd() {
  return (await import("../../commands/codegen")).codegenCommand;
}

async function getBarrel() {
  return (await import("../../commands/barrel")).barrelCommand;
}

export function resetContext(): void {
  resetMocks();
  cg.modules = {};
  cg.loadThrows = null;
  cg.runThrows = null;
  cg.runArgs = null;
  cg.runArgsList = [];
  cg.barrelCalls = [];
  cg.barrelWritten = [];
  cg.barrelThrows = null;
  cg.runResult = {
    outputDir: "/app/src/modules/user/types",
    files: ["users.ts", "registry.ts"],
    scaffolded: ["createUsers.ts"],
  };
  fsState.existsMap = {};
  fsState.existsDefault = false;
}
export {
  describe,
  it,
  expect,
  mock,
  beforeEach,
  fsState,
  createContext,
  realCodegen,
  realOrmCli,
  cg,
  getCmd,
  getBarrel,
};
