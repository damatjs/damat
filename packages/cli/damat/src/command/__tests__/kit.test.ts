// Import the shared setup FIRST so the kit sources snapshot the controllable
// node:fs + node:child_process mocks (see setup.ts for the rationale).
import {
  state as fsState,
  writeCalls,
  rmCalls,
  cpCalls,
  spawnSyncCalls,
  resetMocks,
  mockReaddirSync,
  mockLstatSync,
  mockSpawnSync,
  mockMkdirSync,
} from "./setup";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createContext } from "./helpers";
import {
  KIT_MANIFEST_FILENAME,
  readKitManifest,
  kitManifestErrors,
  targetPathError,
  type KitManifest,
} from "../kit/manifest";
import { buildKitPlan, globToRegExp, staticPrefix } from "../kit/plan";
import { resolveKitSource } from "../kit/source";
import { kitAddCommand, KIT_RECORD_FILENAME } from "../kit/add";
import { kitInitCommand } from "../kit/init";
import { kitValidateCommand } from "../kit/validate";
import { kitCommand } from "../kit";

// The mocked mkdtempSync returns `${prefix}XXXXXX` — this is the temp checkout
// dir every git-sourced kit resolves into.
const TMP = join(tmpdir(), "damat-kit-XXXXXX");

// Per-path readdir/stat fixtures (same style as moduleRemoveUpdate.test.ts).
// Unknown paths fall back to the setup state so simple tests keep the
// ["app.ts"] single-file default.
let readdirMap: Record<string, string[]> = {};
let statDirMap: Record<string, boolean> = {};
let symlinkMap: Record<string, boolean> = {};

// resetMocks() does NOT restore custom spawnSync implementations — reinstall
// the state-driven default (which also feeds the spawnSyncCalls recorder).
const defaultSpawnSyncImpl = (cmd: string, args: string[], opts?: unknown) => {
  spawnSyncCalls.push({ cmd, args, opts });
  return fsState.spawnSyncResult;
};

beforeEach(() => {
  resetMocks();
  readdirMap = {};
  statDirMap = {};
  symlinkMap = {};
  mockReaddirSync.mockImplementation(
    (p: string, _o?: unknown) =>
      readdirMap[p as string] ?? fsState.readdirResult,
  );
  mockLstatSync.mockImplementation((p: string) => ({
    isDirectory: () => statDirMap[p as string] ?? fsState.statIsDirectory,
    isSymbolicLink: () => symlinkMap[p as string] ?? false,
  }));
  mockSpawnSync.mockImplementation(defaultSpawnSyncImpl);
});

// Restore the state-driven defaults for whichever test file runs next.
afterEach(() => {
  resetMocks();
  mockSpawnSync.mockImplementation(defaultSpawnSyncImpl);
});

/** Register a local directory as an existing kit with the given manifest. */
function stageLocalKit(dir: string, manifest: unknown) {
  fsState.existsMap[dir] = true;
  fsState.existsMap[join(dir, KIT_MANIFEST_FILENAME)] = true;
  fsState.readFileMap[join(dir, KIT_MANIFEST_FILENAME)] =
    JSON.stringify(manifest);
}

/** A minimal valid manifest: every file ships to src/kit. */
function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    name: "design-kit",
    mappings: [{ from: "**", to: "src/kit" }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// manifest.ts
// ---------------------------------------------------------------------------
describe("kit manifest", () => {
  it("exports the manifest filename", () => {
    expect(KIT_MANIFEST_FILENAME).toBe("damat-kit.json");
  });

  describe("targetPathError", () => {
    it("rejects empty, absolute, drive-letter, backslash and dot-laden paths", () => {
      expect(targetPathError("")).toBe("must be non-empty");
      expect(targetPathError("/etc/passwd")).toBe("must be relative");
      expect(targetPathError("\\\\share\\x")).toBe("must be relative");
      expect(targetPathError("C:/windows")).toBe("must be relative");
      expect(targetPathError("a/../b")).toBe("must not contain .. or .");
      expect(targetPathError("a\\..\\b")).toBe("must not contain .. or .");
      expect(targetPathError("./x")).toBe("must not contain .. or .");
      expect(targetPathError("..")).toBe("must not contain .. or .");
    });

    it("accepts a safe relative path", () => {
      expect(targetPathError("src/ui/kit")).toBeNull();
    });
  });

  describe("kitManifestErrors", () => {
    it("rejects non-object candidates outright", () => {
      expect(kitManifestErrors(null)).toEqual([
        "manifest must be a JSON object",
      ]);
      expect(kitManifestErrors([1, 2])).toEqual([
        "manifest must be a JSON object",
      ]);
      expect(kitManifestErrors("kit")).toEqual([
        "manifest must be a JSON object",
      ]);
    });

    it("requires a kebab-case name and a mappings array", () => {
      const errors = kitManifestErrors({
        name: "Design Kit",
        mappings: "nope",
      });
      expect(errors.some((e) => e.includes("kebab-case"))).toBe(true);
      expect(
        errors.some((e) => e.includes("`mappings` must be an array")),
      ).toBe(true);
    });

    it("validates every mapping entry's from/to", () => {
      const errors = kitManifestErrors({
        name: "kit",
        mappings: [
          { from: "", to: "/abs" }, // empty glob + absolute target
          null, // not even an object
          { from: "src/**", to: "src/kit" }, // fine
        ],
      });
      expect(errors).toContain("mappings[0].from must be a non-empty glob");
      expect(errors.some((e) => e.startsWith("mappings[0].to"))).toBe(true);
      expect(errors).toContain("mappings[1].from must be a non-empty glob");
      expect(errors.some((e) => e.startsWith("mappings[1].to"))).toBe(true);
      expect(errors.some((e) => e.startsWith("mappings[2]"))).toBe(false);
    });

    it("validates fallback, ignore and packages shapes", () => {
      const errors = kitManifestErrors({
        name: "kit",
        mappings: [],
        fallback: "../up",
        ignore: "*.md",
        packages: null,
      });
      expect(errors).toContain(
        "`fallback` must be a relative path inside the project",
      );
      expect(errors).toContain("`ignore` must be an array of globs");
      expect(errors).toContain("`packages` must be an object of name → range");
      // Non-string fallback is also rejected.
      expect(
        kitManifestErrors({ name: "kit", mappings: [], fallback: 5 }),
      ).toContain("`fallback` must be a relative path inside the project");
    });

    it("returns no errors for a fully-specified valid manifest", () => {
      expect(
        kitManifestErrors({
          name: "auth-kit",
          description: "Auth",
          version: "1.0.0",
          mappings: [{ from: "src/**", to: "src/auth" }],
          fallback: "shared/auth",
          ignore: ["**/*.test.*"],
          packages: { zod: "^3.0.0" },
          notes: "hi",
        }),
      ).toEqual([]);
    });
  });

  describe("readKitManifest", () => {
    it("throws when damat-kit.json is missing", () => {
      expect(() => readKitManifest("/kit")).toThrow(
        `${KIT_MANIFEST_FILENAME} not found in /kit`,
      );
    });

    it("throws on invalid JSON", () => {
      fsState.existsMap[join("/kit", KIT_MANIFEST_FILENAME)] = true;
      fsState.readFileMap[join("/kit", KIT_MANIFEST_FILENAME)] = "{not json";
      expect(() => readKitManifest("/kit")).toThrow(
        new RegExp(`${KIT_MANIFEST_FILENAME} is not valid JSON`),
      );
    });

    it("throws with every structural error listed", () => {
      stageLocalKit("/kit", { name: "Bad Name", mappings: "nope" });
      let message = "";
      try {
        readKitManifest("/kit");
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toContain(`${KIT_MANIFEST_FILENAME} is invalid:`);
      expect(message).toContain("kebab-case");
      expect(message).toContain("`mappings` must be an array");
    });

    it("returns the parsed manifest when valid", () => {
      const manifest = baseManifest({ version: "1.2.3" });
      stageLocalKit("/kit", manifest);
      expect(readKitManifest("/kit")).toEqual(
        manifest as unknown as KitManifest,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// plan.ts
// ---------------------------------------------------------------------------
describe("kit plan", () => {
  describe("globToRegExp", () => {
    it("`**` crosses path segments, including the trailing-`**` form", () => {
      const re = globToRegExp("components/**");
      expect(re.test("components/menu.tsx")).toBe(true);
      expect(re.test("components/nav/menu.tsx")).toBe(true);
      expect(re.test("component.ts")).toBe(false);
    });

    it("collapses `**/` so the segment is optional", () => {
      const re = globToRegExp("src/**/index.ts");
      expect(re.test("src/index.ts")).toBe(true);
      expect(re.test("src/a/b/index.ts")).toBe(true);
      expect(re.test("lib/index.ts")).toBe(false);
    });

    it("`*` stays within one segment", () => {
      const re = globToRegExp("src/*.ts");
      expect(re.test("src/a.ts")).toBe(true);
      expect(re.test("src/a/b.ts")).toBe(false);
      expect(globToRegExp("*.md").test("docs/a.md")).toBe(false);
    });

    it("`?` matches exactly one non-separator character", () => {
      const re = globToRegExp("a?.ts");
      expect(re.test("ab.ts")).toBe(true);
      expect(re.test("a/.ts")).toBe(false);
      expect(re.test("abc.ts")).toBe(false);
    });

    it("escapes regex metacharacters so they match literally", () => {
      const re = globToRegExp("a(1)+b.ts");
      expect(re.test("a(1)+b.ts")).toBe(true);
      expect(re.test("a1b.ts")).toBe(false);
      // "." is literal, not "any char".
      expect(globToRegExp("file.ts").test("fileXts")).toBe(false);
    });
  });

  describe("staticPrefix", () => {
    it("returns the literal directory part before the first wildcard", () => {
      expect(staticPrefix("components/**")).toBe("components/");
      expect(staticPrefix("*.md")).toBe("");
      expect(staticPrefix("a/b/*.ts")).toBe("a/b/");
      expect(staticPrefix("docs/readme.md")).toBe("docs/");
      expect(staticPrefix("readme")).toBe("");
    });
  });

  describe("buildKitPlan", () => {
    it("applies first-match-wins mappings, prefix stripping, fallback, ignore and skips", () => {
      readdirMap = {
        "/kit": [
          "z.txt",
          "components",
          ".git",
          "node_modules",
          "damat-kit.json",
          "README.md",
          "LICENSE",
          "evil-link",
        ],
        "/kit/components": ["nav", "menu.tsx"],
        "/kit/components/nav": ["item.tsx"],
      };
      statDirMap = { "/kit/components": true, "/kit/components/nav": true };
      symlinkMap = { "/kit/evil-link": true }; // symlinks never ship
      const plan = buildKitPlan("/kit", {
        name: "design-kit",
        mappings: [
          { from: "components/**", to: "src/ui" },
          { from: "components/**", to: "elsewhere" }, // never wins — first match already did
          { from: "*.txt", to: "notes" }, // empty static prefix → full path appended
        ],
        fallback: "shared",
        ignore: ["*.md"],
      });
      // Sorted by source; the manifest itself, .git, node_modules and ignored
      // files never appear.
      expect(plan.files).toEqual([
        { source: "LICENSE", target: "shared/LICENSE", via: "fallback" },
        {
          source: "components/menu.tsx",
          target: "src/ui/menu.tsx",
          via: "mapping",
        },
        {
          source: "components/nav/item.tsx",
          target: "src/ui/nav/item.tsx",
          via: "mapping",
        },
        { source: "z.txt", target: "notes/z.txt", via: "mapping" },
      ]);
      expect(plan.unmatched).toEqual([]);
    });

    it("reports unmatched files when the manifest has no fallback", () => {
      readdirMap = { "/kit": ["a.ts", "b.md"] };
      const plan = buildKitPlan("/kit", {
        name: "kit",
        mappings: [{ from: "*.ts", to: "lib" }],
      });
      expect(plan.files).toEqual([
        { source: "a.ts", target: "lib/a.ts", via: "mapping" },
      ]);
      expect(plan.unmatched).toEqual(["b.md"]);
    });
  });
});

// ---------------------------------------------------------------------------
// source.ts
// ---------------------------------------------------------------------------
describe("resolveKitSource", () => {
  it("uses an existing local path as-is with a no-op cleanup", () => {
    fsState.existsMap["/proj/kits/auth"] = true;
    const resolved = resolveKitSource("kits/auth", "/proj");
    expect(resolved.dir).toBe("/proj/kits/auth");
    expect(resolved.origin).toEqual({
      type: "path",
      ref: "kits/auth",
      url: "/proj/kits/auth",
    });
    resolved.cleanup(); // no-op — nothing to remove
    expect(rmCalls).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(0); // never touched git
  });

  it("throws on a source that is neither a path nor a git source", () => {
    expect(() => resolveKitSource("???bad???", "/proj")).toThrow(
      /neither a git URL nor a github shorthand/,
    );
  });

  it("gives a clear error when git is missing", () => {
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // git --version fails
    expect(() => resolveKitSource("acme/kit", "/proj")).toThrow(
      /git is required to add kits from git sources \(https:\/\/github\.com\/acme\/kit\.git\)/,
    );
  });

  it("cleans the temp dir and throws when the clone fails", () => {
    mockSpawnSync.mockImplementation(
      (cmd: string, args: string[], opts?: unknown) => {
        spawnSyncCalls.push({ cmd, args, opts });
        if (args[0] === "--version")
          return { status: 0, stdout: "git version 2", stderr: "" };
        return {
          status: 128,
          stdout: "",
          stderr: "fatal: repository not found",
        };
      },
    );
    expect(() => resolveKitSource("acme/kit", "/proj")).toThrow(
      "git clone failed for https://github.com/acme/kit.git: fatal: repository not found",
    );
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("clones a URL#ref shallow to a temp dir and cleanup removes it", () => {
    const resolved = resolveKitSource(
      "https://github.com/acme/kit.git#v2",
      "/proj",
    );
    expect(resolved.dir).toBe(TMP);
    expect(resolved.origin).toEqual({
      type: "git",
      ref: "https://github.com/acme/kit.git#v2",
      url: "https://github.com/acme/kit.git",
    });
    const clone = spawnSyncCalls.find((c) => c.args[0] === "clone");
    expect(clone!.cmd).toBe("git");
    expect(clone!.args).toEqual([
      "clone",
      "--depth",
      "1",
      "--branch",
      "v2",
      "--",
      "https://github.com/acme/kit.git",
      TMP,
    ]);
    expect(rmCalls).toHaveLength(0);
    resolved.cleanup();
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("refuses a subdirectory that escapes the checkout", () => {
    expect(() => resolveKitSource("acme/mono/../..", "/proj")).toThrow(
      'Subdirectory "../.." escapes the cloned repository',
    );
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("errors when the subdirectory does not exist in the clone", () => {
    expect(() => resolveKitSource("acme/mono/kits/auth", "/proj")).toThrow(
      'Path "kits/auth" not found inside https://github.com/acme/mono.git',
    );
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("resolves into an existing subdirectory of the clone", () => {
    const subDir = resolve(join(TMP, "kits/auth"));
    fsState.existsMap[subDir] = true;
    const resolved = resolveKitSource("acme/mono/kits/auth", "/proj");
    expect(resolved.dir).toBe(subDir);
    expect(resolved.origin).toEqual({
      type: "git",
      ref: "acme/mono/kits/auth",
      url: "https://github.com/acme/mono.git",
    });
    resolved.cleanup(); // removes the whole temp checkout, not just the subdir
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// add.ts
// ---------------------------------------------------------------------------
describe("kit add command", () => {
  it("exports the install-record filename", () => {
    expect(KIT_RECORD_FILENAME).toBe("damat-kits.json");
  });

  it("errors when no source is given", async () => {
    const { ctx, logger } = createContext({});
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith("Usage: damat kit add <source>");
  });

  it("exits 1 when the source cannot be resolved", async () => {
    const { ctx, logger } = createContext({}, { args: ["???bad???"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not resolve kit source"),
      ),
    ).toBe(true);
  });

  it("exits 1 on an invalid manifest and still cleans a git checkout", async () => {
    // Clone succeeds, but the checkout ships no damat-kit.json.
    const { ctx, logger } = createContext({}, { args: ["acme/design-kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some(
        (c) =>
          String(c[0]).includes("Failed to add kit") &&
          String(c[0]).includes(`${KIT_MANIFEST_FILENAME} not found`),
      ),
    ).toBe(true);
    // finally-cleanup removed the temp clone even though the add failed.
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("refuses unsafe package specs before writing anything", async () => {
    stageLocalKit(
      "/kit",
      baseManifest({ packages: { evil: "file:../../pwn" } }),
    );
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("unsafe package specs"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(0); // no bun add either
  });

  it("warns about unmatched files when the kit has no fallback", async () => {
    stageLocalKit("/kit", {
      name: "design-kit",
      mappings: [{ from: "src/**", to: "lib" }],
    });
    const { ctx, logger } = createContext(
      { "dry-run": true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx); // default tree: a single app.ts
    expect(res.exitCode).toBe(0);
    const warn = logger.warn.mock.calls.find((c) =>
      String(c[0]).includes("matched no mapping"),
    );
    expect(warn).toBeDefined();
    expect(String(warn![0])).toContain("- app.ts");
  });

  it("--dry-run prints the full plan (incl. fallback marker and bun add) and writes nothing", async () => {
    stageLocalKit(
      "/kit",
      baseManifest({
        version: "1.0.0",
        description: "UI kit",
        mappings: [{ from: "components/**", to: "src/ui" }],
        fallback: "shared",
        packages: { react: "^18.0.0" },
      }),
    );
    readdirMap = {
      "/kit": ["components", "notes.txt", "damat-kit.json"],
      "/kit/components": ["a.ts"],
    };
    statDirMap = { "/kit/components": true };
    const { ctx, logger } = createContext(
      { "dry-run": true, install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Header logged with version + description + file count.
    const header = logger.info.mock.calls.find(
      (c) => c[0] === 'Kit "design-kit"',
    );
    expect(header![1]).toMatchObject({
      version: "1.0.0",
      description: "UI kit",
      files: 2,
    });
    const plan = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("Dry run"),
    );
    expect(plan).toBeDefined();
    expect(plan![0]).toContain("components/a.ts -> src/ui/a.ts");
    expect(plan![0]).toContain("notes.txt -> shared/notes.txt  (fallback)");
    expect(plan![0]).toContain("+ bun add react");
    // ZERO writes of any kind.
    expect(writeCalls).toHaveLength(0);
    expect(cpCalls).toHaveLength(0);
    expect(mockMkdirSync.mock.calls).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(0);
  });

  it("installs files, records the kit, runs bun add and prints notes", async () => {
    stageLocalKit(
      "/kit",
      baseManifest({
        version: "2.0.0",
        packages: { react: "^18.0.0" },
        notes: "Wire the provider into your app root.",
      }),
    );
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    // app.ts copied to the mapped location, parent dir ensured first.
    expect(cpCalls).toEqual([
      { src: "/kit/app.ts", dest: "/project/src/kit/app.ts", opts: undefined },
    ]);
    expect(
      mockMkdirSync.mock.calls.some((c) => c[0] === "/project/src/kit"),
    ).toBe(true);
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes('Installed 1 file(s) from "design-kit"'),
      ),
    ).toBe(true);
    // The committable record was written.
    const record = writeCalls.find(
      (w) => w.path === join("/project", KIT_RECORD_FILENAME),
    );
    expect(record).toBeDefined();
    const parsed = JSON.parse(record!.content);
    expect(parsed.kits).toHaveLength(1);
    expect(parsed.kits[0]).toMatchObject({
      name: "design-kit",
      version: "2.0.0",
      source: "/kit",
      sourceType: "path",
      files: ["src/kit/app.ts"],
    });
    expect(typeof parsed.kits[0].installedAt).toBe("string");
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes(`Recorded the kit in ${KIT_RECORD_FILENAME}`),
      ),
    ).toBe(true);
    // Packages installed via bun add with lifecycle scripts off by default.
    const bunAdd = spawnSyncCalls.find((c) => c.cmd === "bun");
    expect(bunAdd).toBeDefined();
    expect(bunAdd!.args).toEqual(["add", "--ignore-scripts", "react@^18.0.0"]);
    expect(logger.success).toHaveBeenCalledWith("Packages installed");
    // Notes surfaced at the end.
    expect(
      logger.info.mock.calls.some(
        (c) =>
          String(c[0]).includes('Notes from "design-kit"') &&
          String(c[0]).includes("Wire the provider"),
      ),
    ).toBe(true);
  });

  it("keeps existing files by default and overwrites them with --force", async () => {
    stageLocalKit("/kit", baseManifest());
    fsState.existsMap["/project/src/kit/app.ts"] = true;

    const first = createContext({ install: true }, { args: ["/kit"] });
    const res1 = await kitAddCommand.handler(first.ctx);
    expect(res1.exitCode).toBe(0);
    expect(cpCalls).toHaveLength(0); // kept, not overwritten
    expect(
      first.logger.success.mock.calls.some((c) =>
        String(c[0]).includes("Installed 0 file(s)"),
      ),
    ).toBe(true);
    const warn = first.logger.warn.mock.calls.find((c) =>
      String(c[0]).includes("--force to overwrite"),
    );
    expect(warn).toBeDefined();
    expect(String(warn![0])).toContain("src/kit/app.ts");

    const second = createContext(
      { install: true, force: true },
      { args: ["/kit"] },
    );
    const res2 = await kitAddCommand.handler(second.ctx);
    expect(res2.exitCode).toBe(0);
    expect(cpCalls).toEqual([
      { src: "/kit/app.ts", dest: "/project/src/kit/app.ts", opts: undefined },
    ]);
    expect(
      second.logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("--force to overwrite"),
      ),
    ).toBe(false);
  });

  it("upserts damat-kits.json, replacing the same-name entry and keeping others", async () => {
    stageLocalKit("/kit", baseManifest());
    const recordPath = join("/project", KIT_RECORD_FILENAME);
    fsState.existsMap[recordPath] = true;
    fsState.readFileMap[recordPath] = JSON.stringify({
      kits: [
        {
          name: "design-kit",
          source: "old-source",
          sourceType: "git",
          installedAt: "2020-01-01T00:00:00.000Z",
          files: ["stale.ts"],
        },
        {
          name: "other-kit",
          source: "/elsewhere",
          sourceType: "path",
          installedAt: "2021-01-01T00:00:00.000Z",
          files: ["x.ts"],
        },
      ],
    });
    const { ctx } = createContext({ install: true }, { args: ["/kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const record = writeCalls.find((w) => w.path === recordPath);
    const parsed = JSON.parse(record!.content);
    expect(parsed.kits).toHaveLength(2);
    expect(parsed.kits[0].name).toBe("other-kit"); // untouched sibling kept
    expect(parsed.kits[1]).toMatchObject({
      name: "design-kit",
      source: "/kit",
      sourceType: "path",
      files: ["src/kit/app.ts"],
    });
    expect(parsed.kits[1].installedAt).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("starts a fresh record when the existing damat-kits.json is unreadable", async () => {
    stageLocalKit("/kit", baseManifest());
    const recordPath = join("/project", KIT_RECORD_FILENAME);
    fsState.existsMap[recordPath] = true;
    fsState.readFileMap[recordPath] = "{not json";
    const { ctx } = createContext({ install: true }, { args: ["/kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const record = writeCalls.find((w) => w.path === recordPath);
    const parsed = JSON.parse(record!.content);
    expect(parsed.kits).toHaveLength(1);
    expect(parsed.kits[0].name).toBe("design-kit");
  });

  it("--no-install skips bun add entirely", async () => {
    stageLocalKit("/kit", baseManifest({ packages: { react: "^18.0.0" } }));
    const { ctx } = createContext({ install: false }, { args: ["/kit"] });
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(spawnSyncCalls.some((c) => c.cmd === "bun")).toBe(false);
  });

  it("refuses to write outside the project root even if a plan target escapes", async () => {
    // The manifest's lexical checks make this unreachable through real file
    // trees; a mocked readdir entry with ../ segments exercises the
    // defense-in-depth guard in copyPlanned.
    stageLocalKit(
      "/kit",
      baseManifest({ mappings: [{ from: "**", to: "x" }] }),
    );
    readdirMap = { "/kit": ["../../escape.ts"] };
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Refusing to write outside the project root"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });

  it("exits 1 when bun add fails", async () => {
    stageLocalKit("/kit", baseManifest({ packages: { react: "^18.0.0" } }));
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "boom" };
    const { ctx, logger } = createContext(
      { install: true },
      { args: ["/kit"] },
    );
    const res = await kitAddCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some(
        (c) =>
          String(c[0]).includes("bun add failed") &&
          String(c[0]).includes("boom"),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// init.ts
// ---------------------------------------------------------------------------
describe("kit init command", () => {
  it("derives the kit name from the cwd basename and writes the starter manifest", async () => {
    const { ctx, logger } = createContext({}, { cwd: "/work/my-kit" });
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const write = writeCalls.find(
      (w) => w.path === join("/work/my-kit", KIT_MANIFEST_FILENAME),
    );
    expect(write).toBeDefined();
    const starter = JSON.parse(write!.content);
    expect(starter).toMatchObject({
      name: "my-kit",
      version: "0.1.0",
      mappings: [{ from: "src/**", to: "src/my-kit" }],
      fallback: "shared/my-kit",
    });
    expect(Array.isArray(starter.ignore)).toBe(true);
    expect(logger.success).toHaveBeenCalledWith(
      `Wrote ${KIT_MANIFEST_FILENAME}`,
    );
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("damat kit validate"),
      ),
    ).toBe(true);
  });

  it("prefers an explicit name argument", async () => {
    const { ctx } = createContext(
      {},
      { args: ["design-system"], cwd: "/somewhere/Else" },
    );
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const starter = JSON.parse(writeCalls[0]!.content);
    expect(starter.name).toBe("design-system");
    expect(starter.mappings).toEqual([
      { from: "src/**", to: "src/design-system" },
    ]);
  });

  it("rejects a non-kebab-case name", async () => {
    const { ctx, logger } = createContext({}, { args: ["Bad_Name"] });
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("kebab-case")),
    ).toBe(true);
    expect(writeCalls).toHaveLength(0);
  });

  it("refuses to overwrite an existing manifest", async () => {
    fsState.existsMap[join("/project", KIT_MANIFEST_FILENAME)] = true;
    const { ctx, logger } = createContext({}, { args: ["my-kit"] });
    const res = await kitInitCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      `${KIT_MANIFEST_FILENAME} already exists`,
    );
    expect(writeCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validate.ts
// ---------------------------------------------------------------------------
describe("kit validate command", () => {
  it("exits 1 when the manifest is missing or invalid", async () => {
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Kit manifest invalid"),
      ),
    ).toBe(true);
  });

  it("prints the placement preview and summary for a valid kit", async () => {
    stageLocalKit(
      "/kitproj",
      baseManifest({
        mappings: [{ from: "*.ts", to: "src" }],
        fallback: "shared",
      }),
    );
    readdirMap = { "/kitproj": ["a.ts", "b.md", "damat-kit.json"] };
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const preview = logger.info.mock.calls.find((c) =>
      String(c[0]).includes('Kit "design-kit" placement preview:'),
    );
    expect(preview).toBeDefined();
    expect(preview![0]).toContain("a.ts -> src/a.ts");
    expect(preview![0]).toContain("b.md -> shared/b.md  (fallback)");
    const summary = logger.info.mock.calls.find((c) => c[0] === "Summary");
    expect(summary![1]).toEqual({ mapped: 1, fallback: 1, unmatched: 0 });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.success).toHaveBeenCalledWith("Kit manifest is valid");
  });

  it("warns about unmatched files but still validates", async () => {
    stageLocalKit(
      "/kitproj",
      baseManifest({ mappings: [{ from: "*.ts", to: "src" }] }),
    );
    readdirMap = { "/kitproj": ["a.ts", "b.md", "damat-kit.json"] };
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const warn = logger.warn.mock.calls.find((c) =>
      String(c[0]).includes("installs will skip them"),
    );
    expect(warn).toBeDefined();
    expect(String(warn![0])).toContain("- b.md");
    const summary = logger.info.mock.calls.find((c) => c[0] === "Summary");
    expect(summary![1]).toEqual({ mapped: 1, fallback: 0, unmatched: 1 });
    expect(logger.success).toHaveBeenCalledWith("Kit manifest is valid");
  });

  it("exits 1 when the kit ships no files at all", async () => {
    stageLocalKit(
      "/kitproj",
      baseManifest({ mappings: [{ from: "src/**", to: "lib" }] }),
    );
    readdirMap = { "/kitproj": ["damat-kit.json"] };
    const { ctx, logger } = createContext({}, { cwd: "/kitproj" });
    const res = await kitValidateCommand.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("ships no files"),
      ),
    ).toBe(true);
    expect(logger.success).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// index.ts (the `damat kit` group)
// ---------------------------------------------------------------------------
describe("kit command group", () => {
  it("registers the group with its alias and subcommands", () => {
    expect(kitCommand.name).toBe("kit");
    expect(kitCommand.aliases).toEqual(["k"]);
    expect(kitCommand.subcommands).toEqual([
      kitAddCommand,
      kitInitCommand,
      kitValidateCommand,
    ]);
  });

  it("prints the overview help and exits 0", async () => {
    const { ctx, logger } = createContext({});
    const res = await kitCommand.handler(ctx);
    expect(res.exitCode).toBe(0);
    const help = logger.info.mock.calls[0]![0] as string;
    expect(help).toContain("damat kit init [name]");
    expect(help).toContain("damat kit validate");
    expect(help).toContain("damat kit add <source>");
    expect(help).toContain("--dry-run");
  });
});
