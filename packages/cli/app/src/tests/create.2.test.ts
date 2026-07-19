// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { writeCalls, spawnSyncCalls, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { createCommand } from "../commands/create";
import { CLI_VERSION } from "../version.generated";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const runCreate = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { git: true, install: true, databaseSetup: false, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: createCommand.handler(ctx), logger };
};

const written = (suffix: string) =>
  writeCalls.find((c) => c.path.endsWith(suffix));

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
    expect(pkg.dependencies["@damatjs/durability"]).toBe(`^${CLI_VERSION}`);
    expect(pkg.dependencies["@damatjs/events"]).toBe(`^${CLI_VERSION}`);
    expect(pkg.dependencies["@damatjs/jobs"]).toBe(`^${CLI_VERSION}`);
    expect(pkg.dependencies["@damatjs/pipelines"]).toBe(`^${CLI_VERSION}`);
    expect(pkg.scripts["db:setup"]).toBe("damat-orm database:setup");
    expect(pkg.scripts.dev).toContain("db:setup");
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
    const { result, logger } = runCreate(["my-api"], { dir: "apps/backend" });
    await result;
    expect(written("/base/apps/backend/package.json")).toBeDefined();
    expect(String(logger.info.mock.calls.at(-1)?.[0])).toContain(
      "cd apps/backend",
    );
  });
});
