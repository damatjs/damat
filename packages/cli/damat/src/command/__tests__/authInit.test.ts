// setup.ts installs the process-global node:fs mock and MUST be imported first.
import { state, writeCalls, mockMkdirSync, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { authInitCommand, authCommand } from "../auth";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const run = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { dir: "src/modules", force: false, ...options },
    { args, cwd: "/app" } as never,
  );
  return { result: authInitCommand.handler(ctx), logger };
};

const written = (suffix: string) =>
  writeCalls.find((c) => c.path.endsWith(suffix));

describe("damat auth init — validation", () => {
  test("requires a provider", async () => {
    const { result, logger } = run([]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(writeCalls).toHaveLength(0);
  });

  test("rejects an unknown provider", async () => {
    const { result, logger } = run(["okta"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain('Unknown provider "okta"');
  });
});

describe("damat auth init — hosted providers (no scaffold)", () => {
  for (const provider of ["clerk", "auth0"]) {
    test(`${provider} prints "no local tables" and writes nothing`, async () => {
      const { result, logger } = run([provider]);
      expect((await result).exitCode).toBe(0);
      expect(writeCalls).toHaveLength(0);
      const info = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
      expect(info).toContain("hosted provider");
      expect(info).toContain(`@damatjs/auth-${provider}`);
    });
  }
});

describe("damat auth init better-auth — scaffold", () => {
  test("writes the storage module files, a migrations dir, and registers the module", async () => {
    // A minimal config with a modules block so registration succeeds.
    state.existsMap["/app/damat.config.ts"] = true;
    state.readFileMap["/app/damat.config.ts"] =
      "export default defineConfig({\n  modules: {\n  },\n});\n";

    const { result, logger } = run(["better-auth"]);
    expect((await result).exitCode).toBe(0);

    for (const file of [
      "/app/src/modules/auth/models/index.ts",
      "/app/src/modules/auth/service.ts",
      "/app/src/modules/auth/index.ts",
      "/app/src/modules/auth/module.json",
      "/app/src/modules/auth/README.md",
    ]) {
      expect(writeCalls.some((c) => c.path === file)).toBe(true);
    }
    // migrations dir created
    expect(
      mockMkdirSync.mock.calls.some((c) =>
        String(c[0]).endsWith("/auth/migrations"),
      ),
    ).toBe(true);
    // config gained the auth entry
    const config = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(config!.content).toContain("auth:");
    expect(config!.content).toContain('resolve: "./src/modules/auth"');
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("Registered"),
      ),
    ).toBe(true);
  });

  test("the scaffolded models are valid Damat model source with the Better Auth tables", async () => {
    state.existsDefault = false;
    await run(["better-auth"]).result;
    const models = written("src/modules/auth/models/index.ts")!.content;
    for (const table of [
      'model("user"',
      'model("session"',
      'model("account"',
      'model("verification"',
    ]) {
      expect(models).toContain(table);
    }
    // session/account belong to user
    expect(models).toContain('columns.belongsTo("user")');
  });

  test("refuses when the module already exists without --force", async () => {
    state.existsMap["/app/src/modules/auth"] = true;
    const { result, logger } = run(["better-auth"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain("already exists");
    expect(writeCalls).toHaveLength(0);
  });

  test("overwrites with --force", async () => {
    state.existsMap["/app/src/modules/auth"] = true;
    const { result } = run(["better-auth"], { force: true });
    expect((await result).exitCode).toBe(0);
    expect(written("src/modules/auth/index.ts")).toBeDefined();
  });

  test("warns when damat.config.ts can't be updated automatically", async () => {
    state.existsDefault = false; // no config file
    const { result, logger } = run(["better-auth"]);
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update damat.config.ts"),
      ),
    ).toBe(true);
  });
});

describe("auth command group", () => {
  test("the parent prints a provider cheat-sheet", async () => {
    const { ctx, logger } = createContext({}, {
      args: [],
      cwd: "/app",
    } as never);
    expect((await authCommand.handler(ctx)).exitCode).toBe(0);
    const info = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
    expect(info).toContain("services.auth");
    expect(info).toContain("Better Auth");
  });
});
