// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import {
  state,
  writeCalls,
  spawnSyncCalls,
  mockSpawnSync,
  resetMocks,
} from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { createCommand } from "../create";
import { CLI_VERSION } from "../../version.generated";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const runCreate = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { git: true, install: true, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: createCommand.handler(ctx), logger };
};

const written = (suffix: string) =>
  writeCalls.find((c) => c.path.endsWith(suffix));

describe("damat create — validation", () => {
  test("rejects a missing name without writing anything", async () => {
    const { result, logger } = runCreate([]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(writeCalls).toHaveLength(0);
  });

  test("rejects a non-kebab-case name", async () => {
    const { result } = runCreate(["My_App"]);
    expect((await result).exitCode).toBe(1);
    expect(writeCalls).toHaveLength(0);
  });

  test("refuses when the target directory already exists", async () => {
    state.existsMap["/base/my-api"] = true;
    const { result, logger } = runCreate(["my-api"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain("already exists");
    expect(writeCalls).toHaveLength(0);
  });
});

describe("damat create — scaffold", () => {
  test("writes the full app tree and runs git + bun install", async () => {
    const { result } = runCreate(["my-api"]);
    expect((await result).exitCode).toBe(0);

    for (const file of [
      "/base/my-api/package.json",
      "/base/my-api/damat.config.ts",
      "/base/my-api/tsconfig.json",
      "/base/my-api/.env.example",
      "/base/my-api/.env",
      "/base/my-api/.gitignore",
      "/base/my-api/README.md",
      "/base/my-api/src/api/routes/hello/route.ts",
      "/base/my-api/src/workflows/index.ts",
      "/base/my-api/tests/smoke.test.ts",
    ]) {
      expect(writeCalls.some((c) => c.path === file)).toBe(true);
    }

    // git availability probe, then init -b main, add, commit, then bun install.
    expect(spawnSyncCalls.map((c) => [c.cmd, ...c.args].join(" "))).toEqual([
      "git --version",
      "git init -b main",
      "git add .",
      "git commit -m chore: scaffold damat app",
      "bun install",
    ]);
    expect((spawnSyncCalls[1]!.opts as { cwd: string }).cwd).toBe(
      "/base/my-api",
    );
  });

  test("package.json pins @damatjs/* to the CLI's own version by default", async () => {
    await runCreate(["my-api"]).result;
    const pkg = JSON.parse(written("my-api/package.json")!.content);
    expect(pkg.name).toBe("my-api");
    expect(pkg.dependencies["@damatjs/framework"]).toBe(`^${CLI_VERSION}`);
    expect(pkg.dependencies["@damatjs/damat-cli"]).toBe(`^${CLI_VERSION}`);
  });

  test("--pin overrides the dependency range (and `latest` stays bare)", async () => {
    await runCreate(["my-api"], { pin: "9.9.9" }).result;
    const pkg = JSON.parse(written("my-api/package.json")!.content);
    expect(pkg.dependencies["@damatjs/framework"]).toBe("^9.9.9");

    resetMocks();
    await runCreate(["my-api"], { pin: "latest" }).result;
    const latest = JSON.parse(written("my-api/package.json")!.content);
    expect(latest.dependencies["@damatjs/framework"]).toBe("latest");
  });

  test("--dir overrides the target directory", async () => {
    await runCreate(["my-api"], { dir: "apps/backend" }).result;
    expect(written("/base/apps/backend/package.json")).toBeDefined();
  });

  test(".env gets generated secrets and a commented-out REDIS_URL; .env.example stays placeholder", async () => {
    await runCreate(["my-api"]).result;
    const env = written("my-api/.env")!.content;
    expect(env).toMatch(/JWT_SECRET="[0-9a-f]{64}"/);
    expect(env).toMatch(/COOKIE_SECRET="[0-9a-f]{64}"/);
    expect(env).toContain('# REDIS_URL="redis://localhost:6379"');
    expect(env).toContain("postgres://postgres:postgres@localhost:5432/my_api");

    const example = written("my-api/.env.example")!.content;
    expect(example).toContain('JWT_SECRET=""');
    expect(example).toContain('REDIS_URL="redis://localhost:6379"');
  });

  test("damat.config.ts carries an empty modules block for module add to fill", async () => {
    await runCreate(["my-api"]).result;
    const config = written("my-api/damat.config.ts")!.content;
    expect(config).toContain("modules: {}");
    expect(config).toContain('prefix: "my-api"');
  });

  test("tsconfig has the app-level @workflows aliases module add expects", async () => {
    await runCreate(["my-api"]).result;
    const tsconfig = JSON.parse(written("my-api/tsconfig.json")!.content);
    expect(tsconfig.compilerOptions.paths["@workflows"]).toEqual([
      "./src/workflows",
    ]);
    expect(tsconfig.compilerOptions.paths["@/*"]).toEqual(["./src/*"]);
  });
});

describe("damat create — git/install flags and failures", () => {
  test("--no-git and --no-install skip both spawns", async () => {
    const { result } = runCreate(["my-api"], { git: false, install: false });
    expect((await result).exitCode).toBe(0);
    expect(spawnSyncCalls).toHaveLength(0);
  });

  test("git missing entirely: precise warn, repository init skipped, scaffold still succeeds", async () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // `git --version` fails
    const { result, logger } = runCreate(["my-api"], { install: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("git is not installed"),
      ),
    ).toBe(true);
    // Only the availability probe ran — no init/add/commit attempted.
    expect(spawnSyncCalls).toHaveLength(1);
    expect(spawnSyncCalls[0]!.args).toEqual(["--version"]);
  });

  test("a throwing availability probe is treated as git-missing, not a crash", async () => {
    mockSpawnSync.mockImplementationOnce(() => {
      throw new Error("ENOENT: git not found");
    });
    const { result, logger } = runCreate(["my-api"], { install: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("git is not installed"),
      ),
    ).toBe(true);
  });

  test("git present but init fails (e.g. unconfigured identity): generic warn, scaffold succeeds", async () => {
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      ) // --version
      .mockImplementationOnce(
        () => ({ status: 1, stdout: "", stderr: "bad identity" }) as never,
      );
    const { result, logger } = runCreate(["my-api"], { install: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not initialize git"),
      ),
    ).toBe(true);
    // (once-impls bypass the call recorder, so no spawn-count assertion here;
    // the `&&` short-circuit is covered by the happy-path sequence test.)
  });

  test("a failing bun install warns with manual instructions but exits 0", async () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "network down" };
    const { result, logger } = runCreate(["my-api"], { git: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("bun install failed"),
      ),
    ).toBe(true);
  });

  test("a throwing bun install spawn is treated as failure, not a crash", async () => {
    mockSpawnSync.mockImplementationOnce(() => {
      throw new Error("ENOENT: bun not found");
    });
    const { result, logger } = runCreate(["my-api"], { git: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("bun install failed"),
      ),
    ).toBe(true);
  });

  test("skipping install adds `bun install` to the next steps", async () => {
    const { result, logger } = runCreate(["my-api"], {
      git: false,
      install: false,
    });
    expect((await result).exitCode).toBe(0);
    const info = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
    expect(info).toContain("bun install");
  });
});
