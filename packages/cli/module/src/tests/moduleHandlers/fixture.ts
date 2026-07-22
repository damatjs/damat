import { mock } from "bun:test";
import * as realModule from "@damatjs/module";
import { resetMocks } from "../setup";
import { devFixture, resetDevFixture } from "./devFixture";

export const mm = {
  generateResult: {
    outputDir: "/m/types",
    files: ["users.ts"],
    scaffolded: [] as string[],
  },
  generateThrows: null as Error | null,
  migrationResult: {
    hasChanges: false,
    filePath: undefined as string | undefined,
  },
  migrationThrows: null as Error | null,
  locateThrows: null as Error | null,
  locateResult: "/m/src",
  validateReport: {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    manifest: { name: "demo" } as { name: string } | undefined,
  },
  manifest: {
    name: "user",
    version: "1.0.0",
    description: "User module",
  } as Record<string, unknown>,
  parseRef: null as { name: string } | null,
  registryRecord: null as Record<string, unknown> | null,
  ...devFixture,
};

export function resetHandlerFixture(): void {
  resetMocks();
  mm.generateResult = {
    outputDir: "/m/types",
    files: ["users.ts"],
    scaffolded: [],
  };
  mm.generateThrows = null;
  mm.migrationResult = { hasChanges: false, filePath: undefined };
  mm.migrationThrows = null;
  mm.locateThrows = null;
  mm.locateResult = "/m/src";
  mm.validateReport = {
    valid: true,
    errors: [],
    warnings: [],
    manifest: { name: "demo" },
  };
  mm.manifest = {
    name: "user",
    version: "1.0.0",
    description: "User module",
  };
  mm.parseRef = null;
  mm.registryRecord = null;
  resetDevFixture(mm);
}

mock.module("@damatjs/module", () => ({
  ...realModule,
  generateModuleTypes: async (cwd: string) => {
    mm.calls.push(`generate:${cwd}`);
    if (mm.generateThrows) throw mm.generateThrows;
    return mm.generateResult;
  },
  createModuleMigration: async (cwd: string) => {
    mm.calls.push(`migration:${cwd}`);
    if (mm.migrationThrows) throw mm.migrationThrows;
    return mm.migrationResult;
  },
  locateModuleDir: (cwd: string) => {
    mm.calls.push(`locate:${cwd}`);
    if (mm.locateThrows) throw mm.locateThrows;
    return mm.locateResult;
  },
  validateModuleDir: () => mm.validateReport,
  readModuleManifest: () => mm.manifest,
  evaluateVerification: () => mm.verification,
  parseModuleRef: () => mm.parseRef,
  formatModuleRef: (ref: { name: string }) => ref.name,
  resolveRegistryEntry: async () => mm.registryRecord,
  resolveModuleRuntimePlan: async () => {
    mm.calls.push("runtime-plan");
    return mm.runtimePlan;
  },
  assertServerPortAvailable: async () => {
    mm.calls.push("port-check");
    if (mm.portError) throw mm.portError;
  },
  assertModuleDatabaseConfigured: () => {
    mm.calls.push("database-check");
    if (mm.databaseError) throw mm.databaseError;
  },
}));
