import { beforeEach } from "bun:test";
import { state } from "./state";

export function setupState(): void {
  beforeEach(() => {
    state.connections = [];
    state.ends = 0;
    state.runResult = [];
    state.runArgs = null;
    state.status = { modules: [] };
    state.statusArgs = null;
    state.moduleStatus = {
      module: { name: "user", applied: 0, pending: 0, migrations: [] },
    };
    state.moduleStatusArgs = null;
    state.migrations = [];
    state.discoverArgs = null;
    state.snapshot = false;
    state.snapshotArg = null;
    state.initialArgs = null;
    state.initialError = null;
    state.diffArgs = null;
    state.diffResult = {
      hasChanges: true,
      filePath: "/fake/diff.ts",
      warnings: undefined,
    };
  });
}
