// Import the shared setup FIRST so the command source snapshots the controllable
// node:fs mock (its `existsSync` reads `state.existsMap`).
import "./setup";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { state as fsState } from "./setup";
import { createContext } from "./helpers";
// Capture the REAL surfaces before mocking. `mock.module` is process-global, so
// (like setup.ts does for node:fs) we spread the real exports and override only
// the two functions this test drives — otherwise a narrow mock would strip
// exports siblings rely on (e.g. @damatjs/link's setLinkModuleResolver).
import * as realCodegen from "@damatjs/codegen";
import * as realOrmCli from "@damatjs/orm-cli";

type ModuleEntry = { resolve: string; kind?: string };

const cg = {
  modules: {} as Record<string, ModuleEntry>,
  loadThrows: null as Error | null,
  runArgs: null as any,
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
    return cg.runResult;
  },
}));
// @damatjs/link is NOT mocked — `renderLinkAugmentations` is only reached via the
// `augmentFilesMap` hook, which the mocked `runCodegen` never invokes.

async function getCmd() {
  return (await import("../codegen")).codegenCommand;
}

beforeEach(() => {
  cg.modules = {};
  cg.loadThrows = null;
  cg.runArgs = null;
  cg.runResult = {
    outputDir: "/app/src/modules/user/types",
    files: ["users.ts", "registry.ts"],
    scaffolded: ["createUsers.ts"],
  };
  fsState.existsMap = {};
  fsState.existsDefault = false;
});

describe("damat codegen command", () => {
  it("has the expected wiring", async () => {
    const c = await getCmd();
    expect(c.name).toBe("codegen");
    expect(typeof c.handler).toBe("function");
  });

  it("errors when no module name is given", async () => {
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(cg.runArgs).toBeNull();
  });

  it("errors when the module is not in the config", async () => {
    cg.modules = { other: { resolve: "/app/src/modules/other" } };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(cg.runArgs).toBeNull();
  });

  it("skips link modules with exit 0 and does not run codegen", async () => {
    cg.modules = { user: { resolve: "/app/src/links/user", kind: "link" } };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(cg.runArgs).toBeNull();
  });

  it("errors when the models directory is missing", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": false };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(cg.runArgs).toBeNull();
  });

  it("by default groups routes under the module (workflows grouped too)", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": true };
    const cmd = await getCmd();
    const { ctx } = createContext({}, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(cg.runArgs).toMatchObject({
      moduleResolver: "/app/src/modules/user",
      moduleId: "user",
      serviceDir: "/app/src/modules/user",
      typesDir: "/app/src/modules/user/types",
      routesRoot: "/app/src/api/routes/user",
      workflowsRoot: "/app/src/workflows/user",
    });
    expect(typeof cg.runArgs.augmentFilesMap).toBe("function");
  });

  it("--flat dumps routes flat (workflows still grouped)", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    fsState.existsMap = { "/app/src/modules/user/models": true };
    const cmd = await getCmd();
    const { ctx } = createContext({ flat: true }, { args: ["user"], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(cg.runArgs).toMatchObject({
      routesRoot: "/app/src/api/routes",
      workflowsRoot: "/app/src/workflows/user",
    });
  });
});
