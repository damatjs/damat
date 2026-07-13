// Import the shared setup FIRST so remove.ts / update.ts snapshot the
// controllable node:fs + node:child_process mocks (see setup.ts).
import {
  state as fsState,
  writeCalls,
  rmCalls,
  cpCalls,
  appendCalls,
  spawnSyncCalls,
  resetMocks,
  mockReaddirSync,
  mockStatSync,
  mockReadFileSync,
} from "./setup";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
// Capture the REAL packages before mocking, then spread so only the fns these
// handlers call are replaced (same pattern as moduleHandlers.test.ts). Each
// test file owns its mock registration to stay order-independent.
import * as realModule from "@damatjs/module";
import * as realCodegen from "@damatjs/codegen";

// Shared mutable state the @damatjs/module mock reads (update.ts + source.ts).
const mm = {
  locateThrows: null as Error | null,
  locateResult: "/pkg/src",
  validateReport: { valid: true, errors: [] as string[], warnings: [] as string[] },
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
  locateModuleDir: (_cwd: string) => {
    if (mm.locateThrows) throw mm.locateThrows;
    return mm.locateResult;
  },
  validateModuleDir: (_dir: string) => mm.validateReport,
  readModuleManifest: (_dir: string) => mm.manifest,
  evaluateVerification: (_v: unknown) => mm.verification,
  parseModuleRef: (_input: string) => mm.parseRef,
  formatModuleRef: (ref: { name: string }) => ref.name,
  resolveRegistryEntry: async (_ref: unknown) => mm.registryRecord,
}));

// Record generateBarrels invocations (remove/update rebuild workflow barrels).
const barrelCalls: string[] = [];
mock.module("@damatjs/codegen", () => ({
  ...realCodegen,
  generateBarrels: (dir: string) => {
    barrelCalls.push(dir);
    return { written: [] };
  },
}));

// Per-path readdir/stat fixtures (same style as moduleCopy.test.ts). readdir
// entries may be strings (plain walks) or Dirent-likes (withFileTypes scans).
let readdirMap: Record<string, unknown[]> = {};
let statDirMap: Record<string, boolean> = {};

beforeEach(() => {
  resetMocks();
  barrelCalls.length = 0;
  readdirMap = {};
  statDirMap = {};
  mockReaddirSync.mockImplementation(
    (p: string, _o?: unknown) => (readdirMap[p as string] ?? []) as never,
  );
  mockStatSync.mockImplementation((p: string) => ({
    isDirectory: () => statDirMap[p as string] ?? false,
  }));
  // Read-after-write: a path that was written during the test reads back its
  // latest written content, so config deregister → register sequences see
  // their own edits instead of the static fixture.
  mockReadFileSync.mockImplementation((p: string, _enc?: unknown) => {
    for (let i = writeCalls.length - 1; i >= 0; i--) {
      if (writeCalls[i]!.path === p) return writeCalls[i]!.content;
    }
    return fsState.readFileMap[p as string] ?? "";
  });
  mm.locateThrows = null;
  mm.locateResult = "/pkg/src";
  mm.validateReport = { valid: true, errors: [], warnings: [] };
  mm.manifest = { name: "user", version: "1.1.0", description: "User" };
  mm.parseRef = null;
  mm.registryRecord = null;
  mm.verification = { allowed: true, status: "verified", message: "" };
});

// Restore the state-driven default impls for any test file that runs later.
afterEach(resetMocks);

/** Run fn with DAMAT_MODULE_VERIFY forced to `value` (undefined = unset). */
async function withVerifyPolicy(value: string | undefined, fn: () => Promise<void>) {
  const saved = process.env.DAMAT_MODULE_VERIFY;
  if (value === undefined) delete process.env.DAMAT_MODULE_VERIFY;
  else process.env.DAMAT_MODULE_VERIFY = value;
  try {
    await fn();
  } finally {
    if (saved === undefined) delete process.env.DAMAT_MODULE_VERIFY;
    else process.env.DAMAT_MODULE_VERIFY = saved;
  }
}

/** The shape registerModuleInConfig writes: user (with provenance) + billing. */
const configWithUser = `export default defineConfig({
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
      source: {
        type: "path",
        ref: "/pkg",
        installedAt: "2026-01-01T00:00:00.000Z",
      },
    },
    billing: {
      resolve: "./src/modules/billing",
      id: "billing",
    },
  },
});
`;

const dirent = (name: string, isDir = true) => ({
  name,
  isDirectory: () => isDir,
});

// ---------------------------------------------------------------------------
// damat module remove
// ---------------------------------------------------------------------------
describe("module remove command", () => {
  const get = async () => (await import("../module/remove")).moduleRemoveCommand;

  it("errors when no module id is given", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({ dir: "src/modules" }, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("Usage: damat module remove <id>");
  });

  it("rejects an unsafe module id before touching anything", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["../evil"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("kebab-case")),
    ).toBe(true);
    expect(rmCalls).toHaveLength(0);
  });

  it("exits 1 when the module is not installed at all", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("not installed")),
    ).toBe(true);
    expect(rmCalls).toHaveLength(0);
  });

  it("refuses to remove a module that other installed modules depend on", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
      "/app/src/modules/billing/module.json": true,
      "/app/src/modules/broken/module.json": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser,
      "/app/src/modules/billing/module.json": JSON.stringify({ modules: ["user"] }),
      "/app/src/modules/broken/module.json": "{not json", // ignored dependent
    };
    readdirMap = {
      "/app/src/modules": [
        dirent("user"), // the module itself — skipped
        dirent("billing"),
        dirent("broken"),
        dirent("afile", false), // not a directory — skipped
      ],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    const refusal = logger.error.mock.calls.find((c) =>
      String(c[0]).includes("Refusing to remove"),
    );
    expect(refusal).toBeDefined();
    expect(String(refusal![0])).toContain("billing");
    expect(String(refusal![0])).not.toContain("broken");
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
  });

  it("removes everything with --force despite dependents, incl. config/tsconfig/env cleanup", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/tsconfig.json": true,
      "/app/.env.example": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
      "/app/src/workflows/user": true,
      "/app/src/links/user": true,
      "/app/src/links": true,
      "/app/src/modules/user/module.json": true,
      "/app/src/modules/billing/module.json": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser,
      "/app/tsconfig.json": JSON.stringify({
        compilerOptions: {
          paths: {
            "@user/*": ["./src/modules/user/*"],
            "@workflows": ["./src/workflows"],
          },
        },
      }),
      "/app/.env.example": "BASE=1\n\n# --- module: user ---\nAPI_KEY=abc\n",
      "/app/src/modules/user/module.json": JSON.stringify({ name: "user" }),
      "/app/src/modules/billing/module.json": JSON.stringify({ modules: ["user"] }),
    };
    readdirMap = {
      "/app/src/modules": [dirent("user"), dirent("billing")],
      "/app/src/links": [], // no owners left after removal
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", force: true, "clean-env": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Warned about the dependent but proceeded (--force).
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("billing")),
    ).toBe(true);
    // Every occupied target was deleted.
    for (const target of [
      "/app/src/modules/user",
      "/app/src/workflows/user",
      "/app/src/links/user",
    ]) {
      expect(rmCalls.some((c) => c.path === target)).toBe(true);
    }
    // Links aggregator regenerated; workflow barrels rebuilt.
    expect(writeCalls.some((w) => w.path === "/app/src/links/index.ts")).toBe(true);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("aggregator")),
    ).toBe(true);
    expect(barrelCalls).toContain("/app/src/workflows");
    // Config deregistered — the sibling entry stays intact.
    const config = writeCalls.find((w) => w.path === "/app/damat.config.ts");
    expect(config).toBeDefined();
    expect(config!.content).not.toContain("user:");
    expect(config!.content).toContain("billing:");
    // tsconfig alias removed, shared @workflows kept.
    const tsconfig = writeCalls.find((w) => w.path === "/app/tsconfig.json");
    const json = JSON.parse(tsconfig!.content);
    expect(json.compilerOptions.paths["@user/*"]).toBeUndefined();
    expect(json.compilerOptions.paths["@workflows"]).toEqual(["./src/workflows"]);
    // --clean-env removed the block from .env.example only.
    const env = writeCalls.find((w) => w.path === "/app/.env.example");
    expect(env!.content).toBe("BASE=1\n");
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("Removed from .env.example: API_KEY"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes(".env were left untouched")),
    ).toBe(true);
  });

  it("--dry-run prints the plan and deletes/writes nothing", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
      "/app/src/modules/user/module.json": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser,
      "/app/src/modules/user/module.json": JSON.stringify({ name: "user" }),
    };
    readdirMap = { "/app/src/modules": [dirent("user")] };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "dry-run": true, "clean-env": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    const plan = logger.info.mock.calls.find((c) => String(c[0]).startsWith("Dry run"));
    expect(plan).toBeDefined();
    expect(plan![0]).toContain("delete src/modules/user/");
    expect(plan![0]).toContain('deregister "user" from damat.config.ts');
    expect(plan![0]).toContain('remove "@user/*" alias');
    expect(plan![0]).toContain('# --- module: user ---');
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
    expect(barrelCalls).toHaveLength(0);
  });

  it("warns when the config entry and tsconfig cannot be updated", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
    };
    // First config read (entry lookup) sees the entry; the deregister re-read
    // sees a config it cannot edit safely → conservative false → warning.
    let configReads = 0;
    mockReadFileSync.mockImplementation((p: string) => {
      if (p === "/app/damat.config.ts") {
        return ++configReads === 1 ? configWithUser : "const x = 1;";
      }
      return fsState.readFileMap[p as string] ?? "";
    });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update damat.config.ts"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update tsconfig.json"),
      ),
    ).toBe(true);
  });

  it("reports a failure when the dependents scan throws", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
    };
    fsState.readFileMap = { "/app/damat.config.ts": configWithUser };
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/app/src/modules") throw new Error("EACCES");
      return [] as never;
    });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Failed to remove module"),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// damat module update
// ---------------------------------------------------------------------------
describe("module update command", () => {
  const get = async () => (await import("../module/update")).moduleUpdateCommand;

  /** An installed local-path module whose provenance points at /pkg. */
  function baseInstalled(extra: Record<string, boolean> = {}) {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/pkg": true, // the recorded source resolves as a local path
      ...extra,
    };
    fsState.readFileMap = { "/app/damat.config.ts": configWithUser };
  }

  it("errors when no module id is given", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext({ dir: "src/modules" }, { args: [], cwd: "/app" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("Usage: damat module update <id>");
  });

  it("rejects an unsafe module id", async () => {
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["Evil"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("kebab-case")),
    ).toBe(true);
  });

  it("exits 1 when the module is not installed", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("not installed")),
    ).toBe(true);
  });

  it("exits 1 when the entry has no recorded source provenance", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
    },
  },
});
`,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("no recorded source"),
      ),
    ).toBe(true);
  });

  it("exits 1 when the recorded source cannot be resolved", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      // the recorded ref "???bad???" is not a path, registry ref, or git source
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser.replace('ref: "/pkg"', 'ref: "???bad???"'),
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not resolve recorded source"),
      ),
    ).toBe(true);
  });

  it("refuses a registry update that fails verification", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/cache/user": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser
        .replace('type: "path"', 'type: "registry"')
        .replace('ref: "/pkg"', 'ref: "user"'),
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.1.0",
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
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes('Refusing to update "user": blocked'),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });

  it("--dry-run through the registry prints the diff summary and writes nothing", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/cache/user": true,
      "/cache/user/src": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser
        .replace('type: "path"', 'type: "registry"')
        .replace('ref: "/pkg"', 'ref: "user"'),
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.1.0",
      owner: { namespace: "acme" },
      verification: { status: "verified" },
    };
    mm.verification = { allowed: true, status: "verified", message: "heads up" };
    mm.locateResult = "/cache/user/src";
    // Both trees read as empty → identical; module.json absent → "(unknown)".
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "dry-run": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith("heads up");
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("identical")),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("Dry run — nothing was written"),
      ),
    ).toBe(true);
    expect(writeCalls).toHaveLength(0);
    expect(cpCalls).toHaveLength(0);
    expect(rmCalls).toHaveLength(0);
  });

  it("refuses a recorded path source without --allow-unverified", async () => {
    await withVerifyPolicy(undefined, async () => {
      baseInstalled();
      const cmd = await get();
      const { ctx, logger } = createContext(
        { dir: "src/modules" },
        { args: ["user"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) =>
          String(c[0]).includes("--allow-unverified"),
        ),
      ).toBe(true);
      expect(cpCalls).toHaveLength(0);
    });
  });

  it("blocks an unverified source that fails local validation", async () => {
    baseInstalled();
    mm.validateReport = { valid: false, errors: ["broken entry"], warnings: [] };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("broken entry");
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("failed validation"),
      ),
    ).toBe(true);
  });

  it("refuses unsafe dependency specs before any file is written", async () => {
    await withVerifyPolicy("off", async () => {
      baseInstalled({ "/pkg/package.json": true });
      fsState.readFileMap["/pkg/package.json"] = JSON.stringify({
        dependencies: { evil: "file:../../pwn" },
      });
      const cmd = await get();
      const { ctx, logger } = createContext(
        { dir: "src/modules" },
        { args: ["user"], cwd: "/app" },
      );
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) =>
          String(c[0]).includes("unsafe package specs"),
        ),
      ).toBe(true);
      expect(cpCalls).toHaveLength(0);
    });
  });

  it("prints the file diff and exits 1 without --yes", async () => {
    baseInstalled({
      "/pkg/src": true,
      "/app/src/modules/user/module.json": true,
    });
    fsState.readFileMap = {
      ...fsState.readFileMap,
      "/app/src/modules/user/module.json": JSON.stringify({ version: "0.9.0" }),
      "/pkg/src/b.ts": "new content",
      "/app/src/modules/user/b.ts": "old content",
      "/pkg/src/c.ts": "brand new",
      "/app/src/modules/user/d.ts": "obsolete",
      "/pkg/src/models/m.ts": "same",
      "/app/src/modules/user/models/m.ts": "same",
    };
    readdirMap = {
      // "api" is a split-out subtree → skipped; "node_modules" nested → skipped.
      "/pkg/src": ["api", "b.ts", "c.ts", "models"],
      "/pkg/src/models": ["m.ts", "node_modules"],
      "/app/src/modules/user": ["b.ts", "d.ts", "models"],
      "/app/src/modules/user/models": ["m.ts"],
    };
    statDirMap = {
      "/pkg/src/models": true,
      "/app/src/modules/user/models": true,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    // Version summary used the installed manifest.
    const header = logger.info.mock.calls.find((c) => c[0] === 'Update "user"');
    expect(header![1]).toMatchObject({ installed: "0.9.0", incoming: "1.1.0" });
    // Diff lines: added / changed / removed, with the unchanged file omitted.
    const diff = logger.info.mock.calls.find((c) =>
      String(c[0]).includes("File changes under src/modules/user/:"),
    );
    expect(diff).toBeDefined();
    expect(diff![0]).toContain("+ c.ts");
    expect(diff![0]).toContain("~ b.ts (will be overwritten)");
    expect(diff![0]).toContain("- d.ts (will be deleted)");
    expect(diff![0]).not.toContain("m.ts");
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("local edits")),
    ).toBe(true);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Re-run with --yes")),
    ).toBe(true);
    // Nothing was applied.
    expect(cpCalls).toHaveLength(0);
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
  });

  it("--yes force-reinstalls, refreshes provenance, syncs env, and installs packages", async () => {
    baseInstalled({
      "/pkg/src/workflows": true,
      "/pkg/package.json": true,
    });
    fsState.readFileMap["/pkg/package.json"] = JSON.stringify({
      dependencies: { stripe: "^14.0.0" },
    });
    readdirMap = { "/pkg/src/workflows": ["users"] };
    mm.manifest = {
      name: "user",
      version: "1.1.0",
      env: [{ name: "API_KEY", required: true, example: "x" }],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Force re-install: the module home was wiped and re-copied.
    expect(rmCalls.some((c) => c.path === "/app/src/modules/user")).toBe(true);
    expect(cpCalls.some((c) => c.src === "/pkg/src" && c.dest === "/app/src/modules/user")).toBe(true);
    // Workflows merged into the grouped target, barrels rebuilt.
    expect(
      cpCalls.some((c) => c.dest === "/app/src/workflows/user/users"),
    ).toBe(true);
    expect(barrelCalls).toContain("/app/src/workflows");
    // Provenance refreshed: deregistered then re-registered with a NEW installedAt.
    const configWrites = writeCalls.filter((w) => w.path === "/app/damat.config.ts");
    expect(configWrites.length).toBe(2); // deregister + register
    const final = configWrites[configWrites.length - 1]!.content;
    expect(final).toContain('resolve: "./src/modules/user"');
    expect(final).toContain('ref: "/pkg"');
    expect(final).toContain("installedAt:");
    expect(final).not.toContain("2026-01-01T00:00:00.000Z");
    expect(final).toContain("billing:"); // sibling untouched
    expect(
      logger.success.mock.calls.some((c) => String(c[0]).includes("provenance")),
    ).toBe(true);
    // Env synced into .env.example and reported missing in .env.
    expect(
      appendCalls.some(
        (a) => a.path === "/app/.env.example" && a.content.includes("API_KEY=x"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("API_KEY")),
    ).toBe(true);
    // Packages installed via bun add.
    const bunAdd = spawnSyncCalls.find((c) => c.cmd === "bun");
    expect(bunAdd).toBeDefined();
    expect(bunAdd!.args).toContain("stripe@^14.0.0");
  });

  it("fails when the package install fails after applying", async () => {
    baseInstalled({
      "/pkg/package.json": true,
      "/app/src/modules/user/module.json": true, // broken → version "(unknown)"
    });
    fsState.readFileMap["/pkg/package.json"] = JSON.stringify({
      dependencies: { stripe: "^14.0.0" },
    });
    fsState.readFileMap["/app/src/modules/user/module.json"] = "{not json";
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "boom" };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("bun add failed")),
    ).toBe(true);
  });

  it("warns when the provenance cannot be re-registered", async () => {
    // A config the reader can parse but the writer cannot safely re-edit after
    // the entry is spliced out (no modules block, no defineConfig closing).
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/pkg": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `const cfg = {
  user: {
    resolve: "./src/modules/user",
    id: "user",
    source: {
      type: "path",
      ref: "/pkg",
    },
  },
};
export default cfg;
`,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update damat.config.ts"),
      ),
    ).toBe(true);
  });

  it("reports a failure when the source module cannot be located (inner catch)", async () => {
    baseInstalled();
    mm.locateThrows = new Error("not a module");
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Failed to update module"),
      ),
    ).toBe(true);
  });
});
