import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  createModuleDatabaseSetupCommand,
  loadModuleDatabaseUrl,
} from "../commands/module/databaseSetup";
import { createContext } from "./helpers";
import { loadEnvCalls, resetMocks } from "./setup";

const originalUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  resetMocks();
  delete process.env.DATABASE_URL;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalUrl;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe("module database:setup", () => {
  test("loads DATABASE_URL using development or selected environment", async () => {
    process.env.DATABASE_URL = "postgres://db/module";
    expect(await loadModuleDatabaseUrl("/module")).toBe("postgres://db/module");
    expect(loadEnvCalls).toEqual([["development", "/module"]]);
    process.env.NODE_ENV = "test";
    await loadModuleDatabaseUrl("/other");
    expect(loadEnvCalls.at(-1)).toEqual(["test", "/other"]);
  });

  test("creates the database and then delegates module migrations", async () => {
    process.env.DATABASE_URL = "postgres://db/module";
    const urls: string[] = [];
    const migrations: string[] = [];
    const command = createModuleDatabaseSetupCommand({
      ensure: async (url) => {
        urls.push(url);
        return { created: true };
      },
      migrate: async (ctx) => {
        migrations.push(ctx.cwd);
        return { exitCode: 0 };
      },
    });
    const { ctx, logger } = createContext({}, { cwd: "/module" });
    expect((await command.handler(ctx)).exitCode).toBe(0);
    expect(urls).toEqual(["postgres://db/module"]);
    expect(migrations).toEqual(["/module"]);
    expect(logger.success).toHaveBeenCalled();
  });

  test("reports an existing database and preserves migration results", async () => {
    process.env.DATABASE_URL = "postgres://db/module";
    const command = createModuleDatabaseSetupCommand({
      ensure: async () => ({ created: false }),
      migrate: async () => ({ exitCode: 7 }),
    });
    const { ctx, logger } = createContext({});
    expect((await command.handler(ctx)).exitCode).toBe(7);
    expect(logger.info).toHaveBeenCalled();
  });

  test("fails before migration when URL is absent or setup errors", async () => {
    let migrated = false;
    const command = createModuleDatabaseSetupCommand({
      ensure: async () => {
        throw new Error("permission denied");
      },
      migrate: async () => {
        migrated = true;
        return { exitCode: 0 };
      },
    });
    let current = createContext({});
    expect((await command.handler(current.ctx)).exitCode).toBe(1);
    process.env.DATABASE_URL = "postgres://db/module";
    current = createContext({});
    expect((await command.handler(current.ctx)).exitCode).toBe(1);
    expect(current.logger.error).toHaveBeenCalled();
    expect(migrated).toBe(false);
  });
});
