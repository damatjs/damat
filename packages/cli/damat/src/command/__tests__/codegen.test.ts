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
  // Every runCodegen invocation, in order — lets whole-app tests assert that a
  // module each was generated (runArgs only holds the last call).
  runArgsList: [] as any[],
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
  cg.runArgsList = [];
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

  it("errors when the config has no modules", async () => {
    cg.modules = {};
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(cg.runArgs).toBeNull();
  });

  it("errors when no module name is given and --all is not passed", async () => {
    cg.modules = { user: { resolve: "/app/src/modules/user" } };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    // Default is name-by-name; no name + no --all is an explicit error, not "all".
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(cg.runArgs).toBeNull();
  });

  it("--all generates every non-link module", async () => {
    cg.modules = {
      user: { resolve: "/app/src/modules/user" },
      organization: { resolve: "/app/src/modules/organization" },
      userLink: { resolve: "/app/src/links/user", kind: "link" },
    };
    fsState.existsMap = {
      "/app/src/modules/user/models": true,
      "/app/src/modules/organization/models": true,
    };
    const cmd = await getCmd();
    const { ctx } = createContext({ all: true }, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // user + organization generated; the link module is skipped.
    expect(cg.runArgsList.map((a) => a.moduleId).sort()).toEqual([
      "organization",
      "user",
    ]);
  });

  it("--all soft-skips modules whose models dir is missing", async () => {
    cg.modules = {
      user: { resolve: "/app/src/modules/user" },
      ghost: { resolve: "/app/src/modules/ghost" },
    };
    // Only `user` has a models directory.
    fsState.existsMap = { "/app/src/modules/user/models": true };
    const cmd = await getCmd();
    const { ctx } = createContext({ all: true }, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    // One missing module is a skip, not a failure of the whole run.
    expect(res.exitCode).toBe(0);
    expect(cg.runArgsList.map((a) => a.moduleId)).toEqual(["user"]);
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
