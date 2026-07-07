// Import the shared setup FIRST so the helpers snapshot the controllable
// node:fs + node:child_process mocks. The helpers read/write config, .env,
// package.json and shell out via spawnSync; all of that is faked in setup.
import {
  state as fsState,
  writeCalls,
  appendCalls,
  spawnSyncCalls,
  resetMocks,
  mockReaddirSync,
  mockStatSync,
} from "./setup";
import { describe, it, expect, beforeEach } from "bun:test";

beforeEach(resetMocks);

// ---------------------------------------------------------------------------
// config.ts — registerModuleInConfig / ensureLinksInConfig
// ---------------------------------------------------------------------------
describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../module/helpers/config")).registerModuleInConfig;

  it("returns false when the config file is missing", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user", "./src/modules/user")).toBe(false);
  });

  it("inserts an entry into an existing modules block", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {\n  },\n});\n`,
    };
    const fn = await get();
    const ok = fn("/app/damat.config.ts", "user", "./src/modules/user", {
      type: "registry",
      ref: "user@1.0.0",
      url: "https://x",
      version: "1.0.0",
      owner: "acme",
      verification: "verified",
      integrity: "sha",
      installedAt: "2026-01-01",
    });
    expect(ok).toBe(true);
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain("user:");
    expect(w!.content).toContain('resolve: "./src/modules/user"');
    expect(w!.content).toContain("source:");
    expect(w!.content).toContain('type: "registry"');
  });

  it("is idempotent when the module is already registered", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `modules: {\n  user: { resolve: "./src/modules/user" },\n}`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user", "./src/modules/user")).toBe(true);
    // No write — already present.
    expect(writeCalls.find((c) => c.path === "/app/damat.config.ts")).toBeUndefined();
  });

  it("camelizes a kebab-case module name into a valid key", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `defineConfig({\n  modules: {},\n});\n`,
    };
    const fn = await get();
    fn("/app/damat.config.ts", "user-management", "./src/modules/user-management");
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    // "user-management" → identifier key "userManagement".
    expect(w!.content).toContain("userManagement:");
  });

  it("quotes a non-identifier module key", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `defineConfig({\n  modules: {},\n});\n`,
    };
    const fn = await get();
    fn("/app/damat.config.ts", "1weird", "./src/modules/1weird");
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain('"1weird":');
  });

  it("adds a modules block when none exists, before the closing })", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  name: "app",\n});\n`,
    };
    const fn = await get();
    const ok = fn("/app/damat.config.ts", "user", "./src/modules/user");
    expect(ok).toBe(true);
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain("modules: {");
    expect(w!.content).toContain("user:");
  });

  it("returns false when neither a modules block nor a closing }) is found", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = { "/app/damat.config.ts": `const x = 1;` };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user", "./src/modules/user")).toBe(false);
  });
});

describe("ensureLinksInConfig", () => {
  const get = async () =>
    (await import("../module/helpers/config")).ensureLinksInConfig;

  it("returns false when the config file is missing", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(false);
  });

  it("leaves an existing links: key untouched", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `defineConfig({ links: "./src/links" });`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(true);
    expect(writeCalls.find((c) => c.path === "/app/damat.config.ts")).toBeUndefined();
  });

  it("inserts links before the closing })", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  name: "app",\n});\n`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(true);
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain('links: "./src/links"');
  });

  it("returns false when there is no closing }) to anchor to", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = { "/app/damat.config.ts": `const x = 1;` };
    const fn = await get();
    expect(fn("/app/damat.config.ts")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// tsconfig.ts — registerModuleTsconfigPaths
// ---------------------------------------------------------------------------
describe("registerModuleTsconfigPaths", () => {
  const get = async () =>
    (await import("../module/helpers/tsconfig")).registerModuleTsconfigPaths;

  it("skips when tsconfig.json is missing", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    expect(fn("/app", "user")).toBe("skipped");
  });

  it("skips when tsconfig.json is not plain JSON", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = { "/app/tsconfig.json": `{ // comment\n }` };
    const fn = await get();
    expect(fn("/app", "user")).toBe("skipped");
  });

  it("adds portable aliases and a baseUrl when absent", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = { "/app/tsconfig.json": JSON.stringify({}) };
    const fn = await get();
    expect(fn("/app", "user")).toBe("updated");
    const w = writeCalls.find((c) => c.path === "/app/tsconfig.json");
    const json = JSON.parse(w!.content);
    expect(json.compilerOptions.baseUrl).toBe(".");
    expect(json.compilerOptions.paths["@user/*"]).toEqual([
      "./src/modules/user/*",
    ]);
  });

  it("returns present when all aliases already exist", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = {
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
    const fn = await get();
    expect(fn("/app", "user")).toBe("present");
    expect(writeCalls.find((c) => c.path === "/app/tsconfig.json")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// env.ts — syncEnvVars
// ---------------------------------------------------------------------------
describe("syncEnvVars", () => {
  const get = async () => (await import("../module/helpers/env")).syncEnvVars;

  it("returns empty when the manifest declares no env vars", async () => {
    const fn = await get();
    const res = fn("/app", { name: "demo" } as never);
    expect(res).toEqual({ addedToExample: [], missingInEnv: [] });
    expect(appendCalls).toHaveLength(0);
  });

  it("appends missing vars to .env.example and reports those missing from .env", async () => {
    fsState.existsMap = { "/app/.env.example": true, "/app/.env": true };
    fsState.readFileMap = {
      "/app/.env.example": "EXISTING=1\n",
      "/app/.env": "EXISTING=1\n",
    };
    const fn = await get();
    const res = fn("/app", {
      name: "demo",
      env: [
        { name: "EXISTING", required: true },
        { name: "API_KEY", description: "key", example: "abc", required: true },
        { name: "OPTIONAL", required: false },
      ],
    } as never);
    // EXISTING already in both → not added, not missing.
    expect(res.addedToExample).toContain("API_KEY");
    expect(res.addedToExample).toContain("OPTIONAL");
    expect(res.missingInEnv).toContain("API_KEY");
    expect(res.missingInEnv).not.toContain("OPTIONAL"); // not required
    const appended = appendCalls.find((a) => a.path === "/app/.env.example");
    expect(appended!.content).toContain("API_KEY=abc");
    expect(appended!.content).toContain("# key");
  });

  it("treats absent files as empty content (everything is added/missing)", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    const res = fn("/app", {
      name: "demo",
      env: [{ name: "DB_URL" }],
    } as never);
    expect(res.addedToExample).toEqual(["DB_URL"]);
    expect(res.missingInEnv).toEqual(["DB_URL"]); // required defaults to true
  });
});

// ---------------------------------------------------------------------------
// packages.ts / dependencies.ts
// ---------------------------------------------------------------------------
describe("installModulePackages (packages.ts)", () => {
  const get = async () =>
    (await import("../module/helpers/packages")).installModulePackages;

  it("returns ok with no spawn when there are no packages", async () => {
    const fn = await get();
    const res = fn("/app", {});
    expect(res).toEqual({ ok: true, output: "" });
    expect(spawnSyncCalls).toHaveLength(0);
  });

  it("runs `bun add --ignore-scripts` with versioned + bare specs by default", async () => {
    fsState.spawnSyncResult = { status: 0, stdout: "added", stderr: "" };
    const fn = await get();
    const res = fn("/app", { stripe: "^14.0.0", lodash: "*" });
    expect(res.ok).toBe(true);
    expect(spawnSyncCalls[0]!.cmd).toBe("bun");
    expect(spawnSyncCalls[0]!.args).toEqual([
      "add",
      "--ignore-scripts",
      "stripe@^14.0.0",
      "lodash",
    ]);
  });

  it("drops --ignore-scripts only when allowScripts is set", async () => {
    fsState.spawnSyncResult = { status: 0, stdout: "added", stderr: "" };
    const fn = await get();
    fn("/app", { stripe: "^14.0.0" }, { allowScripts: true });
    expect(spawnSyncCalls[0]!.args).toEqual(["add", "stripe@^14.0.0"]);
  });

  it("reports failure (and combined output) on a non-zero status", async () => {
    fsState.spawnSyncResult = { status: 1, stdout: "out", stderr: "err" };
    const fn = await get();
    const res = fn("/app", { stripe: "^14.0.0" });
    expect(res.ok).toBe(false);
    expect(res.output).toBe("outerr");
  });
});

describe("invalidPackageSpecs (packages.ts)", () => {
  const get = async () =>
    (await import("../module/helpers/packages")).invalidPackageSpecs;

  it("accepts sane names with semver ranges and dist-tags", async () => {
    const fn = await get();
    expect(
      fn({
        stripe: "^14.0.0",
        "@scope/pkg": ">=1.2.3-beta.1",
        lodash: "*",
        next: "latest",
        bare: "",
      }),
    ).toEqual([]);
  });

  it("rejects invalid npm names (flags, spaces, uppercase, traversal)", async () => {
    const fn = await get();
    for (const name of ["--registry=http://x", "a b", "Evil", "../up", ""]) {
      expect(fn({ [name]: "1.0.0" })).toHaveLength(1);
    }
  });

  it("rejects protocol/path ranges and whitespace by default", async () => {
    const fn = await get();
    for (const range of [
      "file:../../pwn",
      "git+https://github.com/a/b.git",
      "https://evil.example/x.tgz",
      "owner/repo",
      ">=1.0.0 <2.0.0",
    ]) {
      const bad = fn({ pkg: range });
      expect(bad).toHaveLength(1);
      expect(bad[0]).toContain("--allow-unverified");
    }
  });

  it("permits protocol ranges — but never whitespace — with allowUnsafeRanges", async () => {
    const fn = await get();
    expect(
      fn(
        { pkg: "git+https://github.com/a/b.git", other: "file:../local" },
        { allowUnsafeRanges: true },
      ),
    ).toEqual([]);
    expect(
      fn({ pkg: "1.0.0; rm -rf /" }, { allowUnsafeRanges: true }),
    ).toHaveLength(1);
  });
});

describe("module add guards (guard.ts)", () => {
  const get = async () => import("../module/helpers/guard");

  it("moduleIdError accepts kebab-case ids and rejects everything else", async () => {
    const { moduleIdError } = await get();
    expect(moduleIdError("user-management")).toBeNull();
    for (const id of ["../evil", "a/b", "..", "Evil", "1bad", ""]) {
      expect(moduleIdError(id)).toContain("kebab-case");
    }
  });

  it("modulesDirError rejects absolute paths and .. segments", async () => {
    const { modulesDirError } = await get();
    expect(modulesDirError("src/modules")).toBeNull();
    expect(modulesDirError("src/./modules")).toBeNull();
    for (const dir of ["/etc", "../out", "src/../../up", ""]) {
      expect(modulesDirError(dir)).toContain("--dir");
    }
  });

  it("unverifiedSourceError gates by opt-in flag and policy", async () => {
    const { unverifiedSourceError } = await get();
    expect(unverifiedSourceError("git", true, "warn")).toBeNull();
    expect(unverifiedSourceError("path", false, "off")).toBeNull();
    for (const policy of ["warn", "require"] as const) {
      const message = unverifiedSourceError("git", false, policy);
      expect(message).toContain("--allow-unverified");
    }
  });
});

describe("collectModulePackages (dependencies.ts duplicate)", () => {
  it("covers the sibling implementation directly", async () => {
    fsState.existsMap = { "/pkg/package.json": true };
    fsState.readFileMap = {
      "/pkg/package.json": JSON.stringify({
        dependencies: { axios: "^1.0.0", "@damatjs/framework": "latest" },
      }),
    };
    const fn = (await import("../module/helpers/dependencies"))
      .collectModulePackages;
    const out = fn("/pkg", { packages: { ms: "^2.0.0" } } as never);
    expect(out).toEqual({ axios: "^1.0.0", ms: "^2.0.0" });
  });

  it("ignores an unreadable package.json (sibling)", async () => {
    fsState.existsMap = { "/pkg/package.json": true };
    fsState.readFileMap = { "/pkg/package.json": "broken" };
    const fn = (await import("../module/helpers/dependencies"))
      .collectModulePackages;
    expect(fn("/pkg", {} as never)).toEqual({});
  });

  it("returns empty when there is no package.json and no overrides", async () => {
    fsState.existsDefault = false;
    const fn = (await import("../module/helpers/dependencies"))
      .collectModulePackages;
    expect(fn("/pkg", {} as never)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// linkTemplates.ts — the filesystem scanners
// ---------------------------------------------------------------------------
describe("linkTemplates fs scanners", () => {
  it("listModelBasenames returns [] when the dir is missing", async () => {
    fsState.existsDefault = false;
    const { listModelBasenames } = await import(
      "../module/helpers/linkTemplates"
    );
    expect(listModelBasenames("/links/user/models")).toEqual([]);
  });

  it("listModelBasenames returns sorted basenames excluding index.ts", async () => {
    fsState.existsMap = { "/links/user/models": true };
    mockReaddirSync.mockImplementationOnce(() => [
      "user-team.ts",
      "index.ts",
      "user-org.ts",
      "notes.md",
    ]);
    const { listModelBasenames } = await import(
      "../module/helpers/linkTemplates"
    );
    expect(listModelBasenames("/links/user/models")).toEqual([
      "user-org",
      "user-team",
    ]);
  });

  it("listOwnerDirs returns [] when the links dir is missing", async () => {
    fsState.existsDefault = false;
    const { listOwnerDirs } = await import("../module/helpers/linkTemplates");
    expect(listOwnerDirs("/links")).toEqual([]);
  });

  it("listOwnerDirs returns sorted owner dirs that contain an index.ts", async () => {
    // /links exists; user (dir w/ index), billing (dir w/o index), file (not dir,
    // statSync throws).
    fsState.existsMap = {
      "/links": true,
      "/links/user/index.ts": true,
      "/links/billing/index.ts": false,
    };
    mockReaddirSync.mockImplementationOnce(() => ["user", "billing", "afile"]);
    mockStatSync.mockImplementation((p: string) => {
      if (String(p).endsWith("afile")) throw new Error("ENOENT");
      return { isDirectory: () => true };
    });
    const { listOwnerDirs } = await import("../module/helpers/linkTemplates");
    expect(listOwnerDirs("/links")).toEqual(["user"]);
  });
});
