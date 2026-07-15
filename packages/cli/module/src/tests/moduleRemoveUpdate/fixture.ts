import { mock } from "bun:test";
import * as realCodegen from "@damatjs/codegen";
import * as realModule from "@damatjs/module";
import {
  mockReadFileSync,
  mockReaddirSync,
  mockStatSync,
  resetMocks,
  state as fsState,
  writeCalls,
} from "../setup";

export const mm = {
  locateThrows: null as Error | null,
  locateResult: "/pkg/src",
  validateReport: {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
  },
  manifest: { name: "user", version: "1.1.0", description: "User" } as Record<
    string,
    unknown
  >,
  parseRef: null as { name: string } | null,
  registryRecord: null as Record<string, unknown> | null,
  verification: { allowed: true, status: "verified", message: "" } as {
    allowed: boolean;
    status: string;
    message?: string;
  },
};
mock.module("@damatjs/module", () => ({
  ...realModule,
  locateModuleDir: () => {
    if (mm.locateThrows) throw mm.locateThrows;
    return mm.locateResult;
  },
  validateModuleDir: () => mm.validateReport,
  readModuleManifest: () => mm.manifest,
  evaluateVerification: () => mm.verification,
  parseModuleRef: () => mm.parseRef,
  formatModuleRef: (ref: { name: string }) => ref.name,
  resolveRegistryEntry: async () => mm.registryRecord,
}));

export const barrelCalls: string[] = [];
mock.module("@damatjs/codegen", () => ({
  ...realCodegen,
  generateBarrels: (dir: string) => {
    barrelCalls.push(dir);
    return { written: [] };
  },
}));
export const maps = {
  readdir: {} as Record<string, unknown[]>,
  statDir: {} as Record<string, boolean>,
};

export function resetRemoveUpdateFixture(): void {
  resetMocks();
  barrelCalls.length = 0;
  maps.readdir = {};
  maps.statDir = {};
  mockReaddirSync.mockImplementation(
    (path) => (maps.readdir[path] ?? []) as never,
  );
  mockStatSync.mockImplementation((path) => ({
    isDirectory: () => maps.statDir[path] ?? false,
  }));
  mockReadFileSync.mockImplementation((path) => {
    for (let index = writeCalls.length - 1; index >= 0; index--) {
      if (writeCalls[index]!.path === path) return writeCalls[index]!.content;
    }
    return fsState.readFileMap[path] ?? "";
  });
  mm.locateThrows = null;
  mm.locateResult = "/pkg/src";
  mm.validateReport = { valid: true, errors: [], warnings: [] };
  mm.manifest = { name: "user", version: "1.1.0", description: "User" };
  mm.parseRef = null;
  mm.registryRecord = null;
  mm.verification = { allowed: true, status: "verified", message: "" };
}
