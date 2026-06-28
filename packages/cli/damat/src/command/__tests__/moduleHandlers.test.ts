// Import the shared setup FIRST so the handlers snapshot the controllable
// node:fs mock (init writes files, list reads dirs) and the full fs surface.
import {
  state as fsState,
  writeCalls,
  unlinkCalls,
  spawnCalls,
  spawnSyncCalls,
  rmCalls,
  loadEnvCalls,
  appendCalls,
  mockMkdirSync,
  mockWriteFileSync,
  mockReaddirSync,
  mockStatSync,
  mockExistsSync,
  resetMocks,
} from "./setup";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createContext } from "./helpers";
// Capture the REAL @damatjs/module before mocking, then spread so only the
// tooling/validation fns these handlers call are replaced — a narrow mock would
// strip exports siblings rely on (setLinkModuleResolver etc.). Same pattern as
// the existing migrationRun / migrationStatus tests.
import * as realModule from "@damatjs/module";
// Same guard for @damatjs/codegen: codegen.test.ts mock.module()s this package
// globally (Bun mocks persist across files) and leaves its generateBarrels stub —
// which throws when its own cg.barrelThrows is set — in place. add.ts calls the
// real generateBarrels, so own the mock here too to stay order-independent.
import * as realCodegen from "@damatjs/codegen";

// Shared mutable state the single @damatjs/module mock reads. Every handler test
// drives behaviour by mutating this, never by re-registering the mock.
const mm = {
  generateResult: {
    outputDir: "/m/types",
    files: ["users.ts"],
    scaffolded: [] as string[],
  },
  generateThrows: null as Error | null,
  migrationResult: { hasChanges: false, filePath: undefined as string | undefined },
  migrationThrows: null as Error | null,
  locateThrows: null as Error | null,
  locateResult: "/m/src",
  validateReport: {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    manifest: { name: "demo" } as { name: string } | undefined,
  },
  // add.ts / source.ts boundary.
  manifest: {
    name: "user",
    version: "1.0.0",
    description: "User module",
  } as Record<string, unknown>,
  parseRef: null as { name: string } | null,
  registryRecord: null as Record<string, unknown> | null,
  verification: { allowed: true, status: "verified", message: "" } as {
    allowed: boolean;
    status: string;
    message?: string;
  },
  calls: [] as string[],
};

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
  validateModuleDir: (_dir: string) => mm.validateReport,
  // add.ts boundary.
  readModuleManifest: (_dir: string) => mm.manifest,
  evaluateVerification: (_v: unknown) => mm.verification,
  // source.ts boundary.
  parseModuleRef: (_input: string) => mm.parseRef,
  formatModuleRef: (ref: { name: string }) => ref.name,
  resolveRegistryEntry: async (_ref: unknown) => mm.registryRecord,
}));

// add.ts rebuilds the app's workflow barrels after a split install. These tests
// drive that via the fs mock (the target src/workflows is kept absent so the real
// helper no-ops); stub generateBarrels to a deterministic no-op so the suite does
// not depend on codegen.test.ts's leaked, throwing stub winning or losing the
// global mock race.
mock.module("@damatjs/codegen", () => ({
  ...realCodegen,
  generateBarrels: () => ({ written: [] }),
}));

beforeEach(() => {
  resetMocks();
  mm.generateResult = { outputDir: "/m/types", files: ["users.ts"], scaffolded: [] };
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
  mm.manifest = { name: "user", version: "1.0.0", description: "User module" };
  mm.parseRef = null;
  mm.registryRecord = null;
  mm.verification = { allowed: true, status: "verified", message: "" };
  mm.calls = [];
});

describe("module codegen command", () => {
  const get = async () => (await import("../module/codegen")).moduleCodegenCommand;

  it("reports generated files and scaffold count on success", async () => {
    mm.generateResult = {
      outputDir: "/m/types",
      files: ["users.ts", "registry.ts"],
      scaffolded: ["createUsers.ts"],
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalledTimes(2);
  });

  it("omits the scaffold line when nothing was scaffolded", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalledTimes(1);
  });

  it("fails when generation throws", async () => {
    mm.generateThrows = new Error("boom");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("module migration:create command", () => {
  const get = async () =>
    (await import("../module/migrationCreate")).moduleMigrationCreateCommand;

  it("reports the created migration when changes exist", async () => {
    mm.migrationResult = { hasChanges: true, filePath: "/m/migrations/x.ts" };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
  });

  it("says no changes when nothing differs", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith("No schema changes detected");
  });

  it("fails when the diff throws", async () => {
    mm.migrationThrows = new Error("nope");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("module validate command", () => {
  const get = async () => (await import("../module/validate")).moduleValidateCommand;

  it("fails when the module dir can't be located", async () => {
    mm.locateThrows = new Error("not a module");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it("succeeds clean when valid with no warnings", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
  });

  it("valid-with-warnings reports info and logs the warnings", async () => {
    mm.validateReport = {
      valid: true,
      errors: [],
      warnings: ["w1"],
      manifest: { name: "demo" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith("w1");
    expect(logger.info).toHaveBeenCalled();
  });

  it("invalid logs errors and exits 1", async () => {
    mm.validateReport = {
      valid: false,
      errors: ["e1"],
      warnings: [],
      manifest: { name: "demo" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("e1");
  });
});

describe("module index command", () => {
  it("prints the help banner and exits 0", async () => {
    const { moduleCommand } = await import("../module/index");
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await moduleCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    expect(moduleCommand.name).toBe("module");
  });
});

describe("module init command", () => {
  const get = async () => (await import("../module/init")).moduleInitCommand;

  it("rejects a missing or invalid name", async () => {
    const cmd = await get();
    for (const args of [[], ["Bad_Name"], ["1bad"]]) {
      const { ctx, logger } = createContext({}, { args, cwd: "/m" });
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(logger.error).toHaveBeenCalled();
    }
  });

  it("errors when the target dir already exists", async () => {
    fsState.existsMap = { "/m/user": true };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { args: ["user"], cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it("scaffolds the full package tree to the default dir", async () => {
    fsState.existsDefault = false;
    const cmd = await get();
    const { ctx, logger } = createContext({}, { args: ["user"], cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
    // Every scaffold file was written under the target dir.
    const written = writeCalls.map((w) => w.path);
    expect(written).toContain("/m/user/package.json");
    expect(written).toContain("/m/user/src/index.ts");
    expect(written).toContain("/m/user/src/config/index.ts");
    expect(written).toContain("/m/user/AGENTS.md");
    expect(mockMkdirSync).toHaveBeenCalled();
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it("honours an explicit --dir", async () => {
    fsState.existsDefault = false;
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "packages/user" },
      { args: ["user"], cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(writeCalls.some((w) => w.path.startsWith("/m/packages/user/"))).toBe(
      true,
    );
  });
});

describe("module list command", () => {
  const get = async () => (await import("../module/list")).moduleListCommand;

  it("reports when the modules directory is absent", async () => {
    fsState.existsDefault = false;
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith("No modules directory at src/modules");
  });

  it("reports when the directory has no module subdirs", async () => {
    fsState.existsMap = { "/m/src/modules": true };
    // readdirSync(withFileTypes) → no directories.
    mockReaddirSync.mockImplementationOnce(() => []);
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalledWith("No modules installed");
  });

  it("lists modules with manifest meta, registration, and provenance", async () => {
    const config = `export default defineConfig({
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
      source: {
        type: "registry",
        owner: "acme",
        verification: "verified",
      },
    },
  },
});
`;
    fsState.existsMap = {
      "/m/src/modules": true,
      "/m/damat.config.ts": true,
      "/m/src/modules/user/module.json": true,
      "/m/src/modules/ghost/module.json": false,
      "/m/src/modules/broken/module.json": true,
    };
    fsState.readFileMap = {
      "/m/damat.config.ts": config,
      "/m/src/modules/user/module.json": JSON.stringify({
        version: "1.2.3",
        description: "Users",
      }),
      "/m/src/modules/broken/module.json": "{not json",
    };
    // The first (and only) readdirSync call returns Dirent-like entries.
    mockReaddirSync.mockImplementationOnce(() => [
      { name: "user", isDirectory: () => true },
      { name: "ghost", isDirectory: () => true },
      { name: "broken", isDirectory: () => true },
      { name: "afile", isDirectory: () => false },
    ]);

    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // user is registered + has provenance meta.
    const userCall = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("user@1.2.3"),
    );
    expect(userCall).toBeDefined();
    expect(userCall![0]).toContain("[registered]");
    expect(userCall![1]).toMatchObject({
      description: "Users",
      from: "registry",
      owner: "acme",
      verification: "verified",
    });
    // ghost has no manifest → "(no module.json)" and NOT registered.
    const ghostCall = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("ghost"),
    );
    expect(ghostCall![0]).toContain("[NOT in damat.config.ts]");
    // broken manifest → "(invalid module.json)".
    const brokenCall = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("broken"),
    );
    expect(brokenCall).toBeDefined();
  });
});

describe("module build command", () => {
  const get = async () => (await import("../module/build")).moduleBuildCommand;

  it("type-checks then validates, succeeding when both pass", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true }; // tsc runs (exit 0)
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // The type-check spawned `bunx tsc --noEmit`.
    expect(spawnCalls[0]!.cmd).toEqual(["bunx", "tsc", "--noEmit"]);
    expect(logger.success).toHaveBeenCalledWith("Module build OK");
  });

  it("aborts with the tsc exit code when the type-check fails", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true };
    fsState.spawnExitCode = 3;
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(3);
    expect(mm.calls.some((c) => c.startsWith("locate"))).toBe(false);
  });

  it("skips the type-check with --no-typecheck and still validates", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true };
    const cmd = await get();
    const { ctx } = createContext({ typecheck: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(0); // no tsc spawned
  });

  it("skips validation with --no-validate", async () => {
    fsState.existsMap = { "/m/tsconfig.json": true };
    const cmd = await get();
    const { ctx, logger } = createContext({ validate: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(mm.calls.some((c) => c.startsWith("locate"))).toBe(false);
    expect(logger.success).toHaveBeenCalledWith("Module build OK");
  });

  it("fails when the module dir cannot be located during validation", async () => {
    fsState.existsDefault = false; // no tsconfig → typecheck skipped
    mm.locateThrows = new Error("not a module");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it("fails and logs errors/warnings when validation reports invalid", async () => {
    fsState.existsDefault = false;
    mm.validateReport = {
      valid: false,
      errors: ["e1"],
      warnings: ["w1"],
      manifest: { name: "demo" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("e1");
    expect(logger.warn).toHaveBeenCalledWith("w1");
  });
});

describe("module dev command", () => {
  const get = async () => (await import("../module/dev")).moduleDevCommand;

  it("creates .damat, writes the entry, loads env, spawns, and cleans up", async () => {
    fsState.existsMap = {
      "/m/.damat": false,
      "/m/.damat/module-dev-entry.ts": true, // exists after write → unlinked
    };
    const cmd = await get();
    const { ctx } = createContext({ port: 4321 }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // .damat created since it did not exist.
    expect(mockMkdirSync).toHaveBeenCalledWith("/m/.damat", { recursive: true });
    // Entry file written with the runModuleEntry bootstrap.
    const entry = writeCalls.find((w) =>
      w.path.endsWith("/.damat/module-dev-entry.ts"),
    );
    expect(entry!.content).toContain("runModuleEntry()");
    // Env loaded for the cwd.
    expect(loadEnvCalls.length).toBeGreaterThan(0);
    // Spawned bun --watch with the port wired into env.
    expect(spawnCalls[0]!.cmd).toEqual([
      "bun",
      "--watch",
      "--no-clear-screen",
      "/m/.damat/module-dev-entry.ts",
    ]);
    expect((spawnCalls[0]!.env as Record<string, string>).PORT).toBe("4321");
    // Entry cleaned up.
    expect(unlinkCalls).toContain("/m/.damat/module-dev-entry.ts");
  });

  it("skips mkdir when .damat exists and omits PORT when no --port", async () => {
    fsState.existsMap = {
      "/m/.damat": true,
      "/m/.damat/module-dev-entry.ts": false, // absent → no unlink
    };
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(mockMkdirSync).not.toHaveBeenCalledWith("/m/.damat", {
      recursive: true,
    });
    expect("PORT" in (spawnCalls[0]!.env as Record<string, string>)).toBe(false);
    expect(unlinkCalls).not.toContain("/m/.damat/module-dev-entry.ts");
  });

  it("returns the subprocess exit code", async () => {
    fsState.existsDefault = false;
    fsState.spawnExitCode = 7;
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(7);
  });
});

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../module/helpers/source")).resolveModuleSource;

  it("resolves an existing local path with a no-op cleanup", async () => {
    fsState.existsMap = { "/abs/mod": true };
    const fn = await get();
    const res = await fn("/abs/mod", "/cwd");
    expect(res.dir).toBe("/abs/mod");
    expect(res.origin).toMatchObject({ type: "path", ref: "/abs/mod" });
    res.cleanup(); // no-op, just exercise it
  });

  it("resolves a relative local path against cwd", async () => {
    fsState.existsMap = { "/cwd/mod": true };
    const fn = await get();
    const res = await fn("./mod", "/cwd");
    expect(res.dir).toBe("/cwd/mod");
    expect(res.origin.type).toBe("path");
  });

  it("resolves a registry ref to its indexed source", async () => {
    // Not an existing path → falls to registry. parseModuleRef matches; the
    // record's source is a local path that exists.
    fsState.existsMap = { "/cwd/.cache/user": true };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cwd/.cache/user",
      version: "1.0.0",
      owner: { namespace: "acme" },
      verification: { status: "verified" },
      integrity: "sha",
    };
    const fn = await get();
    const res = await fn("user", "/cwd");
    expect(res.dir).toBe("/cwd/.cache/user");
    expect(res.origin).toMatchObject({
      type: "registry",
      ref: "user",
      version: "1.0.0",
      owner: "acme",
      verification: "verified",
    });
    expect(res.registry).toBeDefined();
  });

  it("throws for a bare registry name no registry knows", async () => {
    fsState.existsDefault = false;
    mm.parseRef = { name: "ghost" };
    mm.registryRecord = null; // no record
    const fn = await get();
    await expect(fn("ghost", "/cwd")).rejects.toThrow(/registry module reference/);
  });

  it("falls through to git when a slashed registry ref is unknown", async () => {
    // parseModuleRef matches but no record; because the source contains "/", it
    // is NOT treated as a definitive bare registry name — it falls through to
    // the github-shorthand path and clones.
    mm.parseRef = { name: "acme/mod" };
    mm.registryRecord = null;
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    const res = await fn("acme/mod", "/cwd");
    expect(res.origin.type).toBe("git");
    expect(spawnSyncCalls[0]!.args).toContain(
      "https://github.com/acme/mod.git",
    );
  });

  it("clones a git url and returns a cleanup that removes the temp dir", async () => {
    // Local-path probe misses; after the clone the temp dir (the moduleDir, no
    // subdir) exists. Recognize the temp dir by its "damat-module-" prefix.
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    const res = await fn("https://github.com/acme/mod.git#main", "/cwd");
    expect(spawnSyncCalls[0]!.cmd).toBe("git");
    expect(spawnSyncCalls[0]!.args).toContain("clone");
    expect(spawnSyncCalls[0]!.args).toContain("--branch");
    expect(spawnSyncCalls[0]!.args).toContain("main");
    expect(res.origin.type).toBe("git");
    res.cleanup();
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });

  it("resolves a github shorthand with a subdirectory", async () => {
    // Local-path probe misses (no "damat-module-" in "/cwd/acme..."); after the
    // clone the temp dir + subdir exist.
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    const res = await fn("acme/mod/packages/widget", "/cwd");
    expect(res.origin.type).toBe("git");
    expect(spawnSyncCalls[0]!.args).toContain(
      "https://github.com/acme/mod.git",
    );
  });

  it("throws and cleans up when git clone fails", async () => {
    fsState.existsDefault = false;
    fsState.spawnSyncResult = { status: 128, stdout: "", stderr: "fatal: nope" };
    const fn = await get();
    await expect(
      fn("https://github.com/acme/mod.git", "/cwd"),
    ).rejects.toThrow(/git clone failed/);
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });

  it("throws and cleans up when the subdir is missing inside the repo", async () => {
    fsState.existsDefault = false; // temp dir / subdir do NOT exist after clone
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    await expect(
      fn("acme/mod/missing/dir", "/cwd"),
    ).rejects.toThrow(/not found inside/);
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });

  it("throws for input that is neither a path nor a recognizable git source", async () => {
    fsState.existsDefault = false;
    mm.parseRef = null; // not a registry ref either
    const fn = await get();
    await expect(fn("???not a thing???", "/cwd")).rejects.toThrow(
      /neither an existing path nor a recognizable git source/,
    );
  });
});

describe("module add command", () => {
  const get = async () => (await import("../module/add")).moduleAddCommand;

  // A local-path install with no shipped subtrees: resolveModuleSource sees the
  // source path exist; the split copies only the module home; config/tsconfig/env
  // are present so the registration branches all run.
  function baseLocalInstall(extra: Record<string, boolean> = {}) {
    fsState.existsMap = {
      "/pkg": true, // local source exists
      "/pkg/src/api/routes": false,
      "/pkg/src/workflows": false,
      "/pkg/src/links": false,
      "/pkg/tests": false,
      "/app/src/modules/user": false, // target absent → no --force needed
      "/app/damat.config.ts": true,
      "/app/tsconfig.json": true,
      "/app/.env.example": false,
      "/app/.env": false,
      "/pkg/package.json": false,
      ...extra,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    mm.locateResult = "/pkg/src";
  }

  it("errors when no source argument is given", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it("errors when the source cannot be resolved", async () => {
    fsState.existsDefault = false;
    mm.parseRef = null; // not a registry ref; "/nope" not a path → throws
    const cmd = await get();
    const { ctx, logger } = createContext(
      {},
      { args: ["???bad???"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it("installs a plain local module and registers it everywhere", async () => {
    baseLocalInstall();
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Registered in config + tsconfig aliases written + success logged.
    expect(
      writeCalls.some((w) => w.path === "/app/damat.config.ts"),
    ).toBe(true);
    expect(writeCalls.some((w) => w.path === "/app/tsconfig.json")).toBe(true);
    expect(logger.success).toHaveBeenCalled();
    // path-source provenance branch (not registry).
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[1] && JSON.stringify(c[1])).includes('"from":"path"'),
      ),
    ).toBe(true);
  });

  it("warns about an unmet module dependency", async () => {
    baseLocalInstall({ "/app/src/modules/billing": false });
    mm.manifest = {
      name: "user",
      version: "1.0.0",
      description: "User",
      modules: ["billing"],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    await cmd.handler(ctx);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("billing")),
    ).toBe(true);
  });

  it("refuses to overwrite an existing target without --force", async () => {
    baseLocalInstall({ "/app/src/modules/user": true });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("already exists")),
    ).toBe(true);
  });

  it("installs over an existing target with --force", async () => {
    baseLocalInstall({ "/app/src/modules/user": true });
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "src/modules", force: true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
  });

  it("logs the split targets and rebuilds workflow barrels when present", async () => {
    baseLocalInstall({
      "/pkg/src/api/routes": true,
      "/pkg/src/workflows": true,
      "/pkg/tests": true,
      // generateBarrels is stubbed to a no-op above; the target tree stays absent
      // anyway to mirror a fresh app.
      "/app/src/workflows": false,
    });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    // mergeChildren reads each subtree's children.
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/pkg/src/api/routes") return ["users"] as never;
      if (p === "/pkg/src/workflows") return ["users"] as never;
      if (p === "/pkg/tests") return ["contract.test.ts"] as never;
      return [] as never;
    });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("routes →")),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("workflows →")),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("tests →")),
    ).toBe(true);
  });

  it("installs shipped links, ensures links config, and prints link next-steps", async () => {
    baseLocalInstall({
      "/pkg/src/links": true,
      "/app/src/links/user/models/user-org.ts": false,
      "/app/src/links/user/models": true,
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/pkg/src/links") return ["user-org.ts"] as never;
      if (p === "/app/src/links/user/models") return ["user-org.ts"] as never;
      if (p === "/app/src/links") return ["user"] as never;
      return [] as never;
    });
    mockStatSyncForLinks();
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("links →")),
    ).toBe(true);
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes('links: "./src/links"'),
      ),
    ).toBe(true);
    // Link next-steps printed.
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("migrate:create link:")),
    ).toBe(true);
  });

  it("warns when links cannot be ensured in an unparseable config", async () => {
    baseLocalInstall({
      "/pkg/src/links": true,
      "/app/src/links/user/models/user-org.ts": false,
      "/app/src/links/user/models": true,
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    });
    // A config with neither a modules block nor a closing `})` → both
    // registerModuleInConfig and ensureLinksInConfig return false.
    fsState.readFileMap = {
      "/app/damat.config.ts": `const config = 1;`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/pkg/src/links") return ["user-org.ts"] as never;
      if (p === "/app/src/links/user/models") return ["user-org.ts"] as never;
      if (p === "/app/src/links") return ["user"] as never;
      return [] as never;
    });
    mockStatSyncForLinks();
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes('Add `links: "./src/links"`'),
      ),
    ).toBe(true);
  });

  it("refuses a registry install that fails verification", async () => {
    fsState.existsMap = {
      "/app/src/modules/user": false,
      "/cache/user": true, // the record's resolved source
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.0.0",
      owner: { namespace: "acme" },
      verification: { status: "unverified" },
    };
    mm.verification = { allowed: false, status: "unverified", message: "blocked" };
    mm.locateResult = "/cache/user/src";
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Refusing")),
    ).toBe(true);
  });

  it("warns on a verification message but proceeds", async () => {
    fsState.existsMap = {
      "/cache/user": true,
      "/cache/user/src/api/routes": false,
      "/cache/user/src/workflows": false,
      "/cache/user/src/links": false,
      "/cache/user/tests": false,
      "/app/src/modules/user": false,
      "/app/damat.config.ts": true,
      "/app/tsconfig.json": true,
      "/app/.env.example": false,
      "/app/.env": false,
      "/cache/user/package.json": false,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.0.0",
      owner: { namespace: "acme" },
      verification: { status: "verified" },
    };
    mm.verification = { allowed: true, status: "verified", message: "heads up" };
    mm.locateResult = "/cache/user/src";
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith("heads up");
  });

  it("warns when config/tsconfig cannot be edited and reports missing env + installs packages", async () => {
    baseLocalInstall({
      "/app/damat.config.ts": false, // registerModuleInConfig → false (warn)
      "/app/tsconfig.json": false, // registerModuleTsconfigPaths → skipped (warn)
      "/app/.env.example": true,
      "/app/.env": false,
      "/pkg/package.json": true, // collectModulePackages reads deps
    });
    fsState.readFileMap = {
      "/app/.env.example": "",
      "/pkg/package.json": JSON.stringify({ dependencies: { stripe: "^14.0.0" } }),
    };
    mm.manifest = {
      name: "user",
      version: "1.0.0",
      description: "User",
      env: [{ name: "STRIPE_KEY", required: true, example: "sk" }],
    };
    fsState.spawnSyncResult = { status: 0, stdout: "ok", stderr: "" };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Could-not-update warnings for config + tsconfig.
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("damat.config.ts")),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("tsconfig.json")),
    ).toBe(true);
    // Env var added + reported missing.
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes(".env.example")),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("before starting")),
    ).toBe(true);
    expect(appendCalls.length).toBeGreaterThan(0);
    // `bun add` ran.
    expect(spawnSyncCalls.some((c) => c.cmd === "bun")).toBe(true);
  });

  it("fails when the package install fails", async () => {
    baseLocalInstall({ "/pkg/package.json": true });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
      "/pkg/package.json": JSON.stringify({ dependencies: { stripe: "^14.0.0" } }),
    };
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "boom" };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("bun add failed")),
    ).toBe(true);
  });

  it("reports a tsconfig 'present' (no-op) without warning when aliases exist", async () => {
    baseLocalInstall();
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@user/*": ["./src/modules/user/*"],
            "@workflows": ["./src/workflows"],
            "@workflows/*": ["./src/workflows/*"],
          },
        },
      }),
    };
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // tsconfig untouched (already present).
    expect(writeCalls.some((w) => w.path === "/app/tsconfig.json")).toBe(false);
  });

  it("reports a failure when installModuleSplit throws (inner catch)", async () => {
    baseLocalInstall();
    // Make readModuleManifest throw AFTER resolveModuleSource succeeds → the
    // inner try/catch reports and the finally still runs cleanup.
    mm.manifest = undefined as never;
    const cmd = await get();
    // readModuleManifest returns undefined → manifest.name throws inside try.
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});

// statSync helper for the links install path: owner dir + walked models dir.
function mockStatSyncForLinks() {
  mockStatSync.mockImplementation((p: string) => ({
    isDirectory: () => String(p).endsWith("/user") || String(p).endsWith("models"),
  }));
}
