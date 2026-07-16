import { mock } from "bun:test";

export const state = {
  connections: [] as string[],
  ends: 0,
  runResult: [] as Array<{ success: boolean; error?: Error }>,
  runArgs: null as any,
  status: { modules: [] as any[] },
  statusArgs: null as any,
  moduleStatus: {
    module: { name: "user", applied: 0, pending: 0, migrations: [] },
  },
  moduleStatusArgs: null as any,
  migrations: [] as Array<{ name: string }>,
  discoverArgs: null as any,
  snapshot: false,
  snapshotArg: null as any,
  initialResult: "/fake/initial.ts",
  initialArgs: null as any,
  initialError: null as Error | null,
  diffResult: {
    hasChanges: true,
    filePath: "/fake/diff.ts",
    warnings: undefined as string[] | undefined,
  },
  diffArgs: null as any,
};

class FakePool {
  constructor(options: { connectionString: string }) {
    state.connections.push(options.connectionString);
  }
  async end() {
    state.ends++;
  }
}

mock.module("@damatjs/deps/pg", () => ({ Pool: FakePool }));
mock.module("@damatjs/orm-migration", () => ({
  runMigrations: async (pool: unknown, modules: unknown, options: unknown) => {
    state.runArgs = { pool, modules, options };
    return state.runResult;
  },
  getMigrationStatus: async (
    pool: unknown,
    modules: unknown,
    options: unknown,
  ) => {
    state.statusArgs = { pool, modules, options };
    return state.status;
  },
  getModuleMigrationStatus: async (pool: unknown, module: unknown) => {
    state.moduleStatusArgs = { pool, module };
    return state.moduleStatus;
  },
  discoverAllMigrations: (value: unknown) => {
    state.discoverArgs = value;
    return state.migrations;
  },
  createInitialMigration: async (name: string, resolve: string) => {
    state.initialArgs = { name, resolve };
    if (state.initialError) throw state.initialError;
    return state.initialResult;
  },
  createDiffMigration: async (name: string, resolve: string) => {
    state.diffArgs = { name, resolve };
    return state.diffResult;
  },
}));
mock.module("@damatjs/orm-processor", () => ({
  snapshotExist: (value: unknown) => {
    state.snapshotArg = value;
    return state.snapshot;
  },
}));

export { FakePool };
