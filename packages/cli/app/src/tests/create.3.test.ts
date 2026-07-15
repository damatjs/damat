// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { writeCalls, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { createCommand } from "../commands/create";
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

describe("damat create — scaffold", () => {
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
