// Import the shared setup FIRST so copy.ts snapshots the controllable node:fs
// mock (cpSync/readdirSync/statSync/existsSync/mkdirSync/writeFileSync/rmSync).
import {
  state as fsState,
  cpCalls,
  rmCalls,
  writeCalls,
  resetMocks,
  mockReaddirSync,
  mockStatSync,
  mockMkdirSync,
} from "./setup";
import { describe, it, expect, beforeEach } from "bun:test";
import { sep } from "node:path";

// Per-path readdir / stat fixtures so installModuleSplit's tree walks are
// deterministic. Keys are absolute dirs; values are entry-name arrays. statMap
// maps an absolute path → isDirectory boolean.
let readdirMap: Record<string, string[]> = {};
let statDirMap: Record<string, boolean> = {};

beforeEach(() => {
  resetMocks();
  readdirMap = {};
  statDirMap = {};
  mockReaddirSync.mockImplementation(
    (p: string) => readdirMap[p as string] ?? [],
  );
  mockStatSync.mockImplementation((p: string) => ({
    isDirectory: () => statDirMap[p as string] ?? false,
  }));
});

describe("copyModule", () => {
  it("copies a directory recursively, filtering VCS/deps", async () => {
    const { copyModule } = await import("../module/helpers/copy");
    copyModule("/src/mod", "/dest/mod");
    const call = cpCalls.find((c) => c.src === "/src/mod");
    expect(call).toBeDefined();
    expect((call!.opts as { recursive: boolean }).recursive).toBe(true);
    // The filter rejects .git / node_modules paths.
    const filter = (call!.opts as { filter: (s: string) => boolean }).filter;
    expect(filter("/src/mod/models/user.ts")).toBe(true);
    expect(filter("/src/mod/.git")).toBe(false);
    expect(filter("/src/mod/.git/config")).toBe(false);
    expect(filter("/src/mod/node_modules")).toBe(false);
    expect(filter("/src/mod/node_modules/x")).toBe(false);
  });
});

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("copies just the module home when it ships no api/workflows/links/tests", async () => {
    // No subtrees present; collectLinkModelFiles sees no links dir.
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: false,
      [`/pkg/tests`]: false,
    };
    const { installModuleSplit } = await import("../module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    expect(layout.moduleHome).toBe("/app/src/modules/user");
    expect(layout.apiTarget).toBeNull();
    expect(layout.workflowsTarget).toBeNull();
    expect(layout.linksTarget).toBeNull();
    expect(layout.testsTarget).toBeNull();
    // The module-home copy ran with a filter that excludes the split subtrees.
    const home = cpCalls.find((c) => c.dest === "/app/src/modules/user");
    expect(home).toBeDefined();
    const filter = (home!.opts as { filter: (s: string) => boolean }).filter;
    expect(filter(`${src}/models/user.ts`)).toBe(true);
    expect(filter(`${src}/api`)).toBe(false);
    expect(filter(`${src}/api${sep}routes`)).toBe(false);
    expect(filter(`${src}/workflows`)).toBe(false);
    expect(filter(`${src}/links`)).toBe(false);
    expect(filter(`${src}/tests`)).toBe(false);
    expect(filter(`${src}/.git`)).toBe(false);
  });

  it("force-wipes an existing module home before copying", async () => {
    fsState.existsMap = {
      "/app/src/modules/user": true, // exists → rm on force
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: false,
      [`/pkg/tests`]: false,
    };
    const { installModuleSplit } = await import("../module/helpers/copy");
    installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
      force: true,
    });
    expect(rmCalls.some((c) => c.path === "/app/src/modules/user")).toBe(true);
  });

  it("merges api routes, workflows and tests subtrees into grouped targets", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: true,
      [`${src}/workflows`]: true,
      [`${src}/links`]: false,
      [`/pkg/tests`]: true,
    };
    // mergeChildren reads each subtree's children.
    readdirMap = {
      [`${src}/api/routes`]: ["users", "posts"],
      [`${src}/workflows`]: ["users"],
      [`/pkg/tests`]: ["contract.test.ts"],
    };
    const { installModuleSplit } = await import("../module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    expect(layout.apiTarget).toBe("/app/src/api/routes/user");
    expect(layout.workflowsTarget).toBe("/app/src/workflows/user");
    expect(layout.testsTarget).toBe("/app/tests/user");
    // Each child of api/routes was copied into the grouped target.
    expect(
      cpCalls.some((c) => c.dest === "/app/src/api/routes/user/users"),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/src/api/routes/user/posts"),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/src/workflows/user/users"),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/tests/user/contract.test.ts"),
    ).toBe(true);
  });

  it("installs shipped link models and regenerates both barrels", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: true,
      [`/pkg/tests`]: false,
      // collectLinkModelFiles walk: links dir holds models/ with two .ts.
      // installModuleLinks copies skip-existing — destinations absent so copied.
      "/app/src/links/user/models/user-org.ts": false,
      "/app/src/links/user/models/user-team.ts": false,
      // renderOwnerIndex → listModelBasenames(modelsTarget): dir exists.
      "/app/src/links/user/models": true,
      // renderAggregator → listOwnerDirs(linksRoot): dir exists, owner has index.
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    };
    // Walk of the shipped links source: links/ -> models/ (dir) -> two files.
    readdirMap = {
      [`${src}/links`]: ["models"],
      [`${src}/links/models`]: ["user-org.ts", "user-team.ts", "index.ts"],
      // listModelBasenames over the installed models target.
      "/app/src/links/user/models": ["user-org.ts", "user-team.ts", "index.ts"],
      // listOwnerDirs over the links root.
      "/app/src/links": ["user"],
    };
    statDirMap = {
      [`${src}/links/models`]: true, // a directory → walked
      "/app/src/links/user": true, // owner dir
    };
    const { installModuleSplit } = await import("../module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    expect(layout.linksTarget).toBe("/app/src/links/user");
    // models/ + migrations/ dirs ensured.
    expect(
      mockMkdirSync.mock.calls.some(
        (c) => c[0] === "/app/src/links/user/models",
      ),
    ).toBe(true);
    expect(
      mockMkdirSync.mock.calls.some(
        (c) => c[0] === "/app/src/links/user/migrations",
      ),
    ).toBe(true);
    // The two shipped models were copied.
    expect(
      cpCalls.some((c) => c.dest === "/app/src/links/user/models/user-org.ts"),
    ).toBe(true);
    // Owner index + top-level aggregator regenerated.
    expect(
      writeCalls.some((w) => w.path === "/app/src/links/user/index.ts"),
    ).toBe(true);
    expect(writeCalls.some((w) => w.path === "/app/src/links/index.ts")).toBe(
      true,
    );
  });

  it("preserves an owner-edited link target (skip-existing) unless forced", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: true,
      [`/pkg/tests`]: false,
      // The destination already exists and force is false → NOT overwritten.
      "/app/src/links/user/models/user-org.ts": true,
      "/app/src/links/user/models": true,
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    };
    readdirMap = {
      [`${src}/links`]: ["user-org.ts"],
      "/app/src/links/user/models": ["user-org.ts"],
      "/app/src/links": ["user"],
    };
    statDirMap = { "/app/src/links/user": true };
    const { installModuleSplit } = await import("../module/helpers/copy");
    installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    // The existing model was preserved (no cpSync to that destination).
    expect(
      cpCalls.some((c) => c.dest === "/app/src/links/user/models/user-org.ts"),
    ).toBe(false);
  });

  it("exposes the same layout via moduleLayoutPaths (install/remove single source of truth)", async () => {
    const { moduleLayoutPaths } = await import("../module/helpers/copy");
    expect(moduleLayoutPaths("/app", "user", "src/modules")).toEqual({
      moduleHome: "/app/src/modules/user",
      apiTarget: "/app/src/api/routes/user",
      workflowsTarget: "/app/src/workflows/user",
      linksRoot: "/app/src/links",
      linksTarget: "/app/src/links/user",
      testsTarget: "/app/tests/user",
    });
  });

  it("defaults packageDir to sourceModuleDir for the legacy layout", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: false,
      [`${src}/tests`]: true, // legacy: tests sit inside the module dir
    };
    readdirMap = { [`${src}/tests`]: ["contract.test.ts"] };
    const { installModuleSplit } = await import("../module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
    });
    expect(layout.testsTarget).toBe("/app/tests/user");
  });
});

describe("removeModuleSplit", () => {
  const cwd = "/app";

  it("removes every existing layout target and regenerates the links aggregator", async () => {
    fsState.existsMap = {
      "/app/src/modules/user": true,
      "/app/src/api/routes/user": true,
      "/app/src/workflows/user": true,
      "/app/src/links/user": true,
      "/app/tests/user": true,
      "/app/src/links": true, // aggregator regenerated from remaining owners
      "/app/src/links/billing/index.ts": true,
    };
    // listOwnerDirs over the links root after removal: billing remains.
    readdirMap = { "/app/src/links": ["billing"] };
    statDirMap = { "/app/src/links/billing": true };
    const { removeModuleSplit } = await import("../module/helpers/copy");
    const result = removeModuleSplit(cwd, "user", "src/modules");
    expect(result.removed).toEqual([
      "/app/src/modules/user",
      "/app/src/api/routes/user",
      "/app/src/workflows/user",
      "/app/src/links/user",
      "/app/tests/user",
    ]);
    expect(result.linksRegenerated).toBe(true);
    // Each target was rm'd recursively.
    for (const target of result.removed) {
      expect(
        rmCalls.some(
          (c) =>
            c.path === target &&
            (c.opts as { recursive: boolean }).recursive === true,
        ),
      ).toBe(true);
    }
    // Aggregator rewritten from the surviving owner dirs.
    const aggregator = writeCalls.find(
      (w) => w.path === "/app/src/links/index.ts",
    );
    expect(aggregator).toBeDefined();
    expect(aggregator!.content).toContain("billingLinks");
    expect(aggregator!.content).not.toContain("userLinks");
  });

  it("is a no-op when the module occupies nothing", async () => {
    fsState.existsDefault = false;
    const { removeModuleSplit } = await import("../module/helpers/copy");
    const result = removeModuleSplit(cwd, "user", "src/modules");
    expect(result.removed).toEqual([]);
    expect(result.linksRegenerated).toBe(false);
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
  });

  it("skips the aggregator when the links root itself is gone", async () => {
    fsState.existsMap = {
      "/app/src/links/user": true, // had links…
      "/app/src/links": false, // …but the whole links root was deleted too
    };
    const { removeModuleSplit } = await import("../module/helpers/copy");
    const result = removeModuleSplit(cwd, "user", "src/modules");
    expect(result.removed).toEqual(["/app/src/links/user"]);
    expect(result.linksRegenerated).toBe(false);
    expect(writeCalls).toHaveLength(0);
  });
});
