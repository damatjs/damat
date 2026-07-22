import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  buildModuleAppConfig,
  DEFAULT_MODULE_PORT,
  defineModuleConfig,
  type ModuleManifest,
} from "../src";

const manifest = { name: "user" } as ModuleManifest;
const keys = [
  "DATABASE_URL",
  "REDIS_URL",
  "NODE_ENV",
  "HOST",
  "LOG_LEVEL",
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of keys) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("module runtime config", () => {
  test("defineModuleConfig preserves identity", () => {
    const config = { projectConfig: { nodeEnv: "production" as const } };
    expect(defineModuleConfig(config)).toBe(config);
  });

  test("applies standalone defaults", () => {
    const config = buildModuleAppConfig({
      moduleDir: "/abs/module",
      manifest,
      moduleConfig: {},
    });
    expect(config.projectConfig.databaseUrl).toBeUndefined();
    expect(config.projectConfig.redisUrl).toBeUndefined();
    expect(config.projectConfig.nodeEnv).toBe("development");
    expect(config.projectConfig.http.host).toBe("0.0.0.0");
    expect(config.projectConfig.http.port).toBe(DEFAULT_MODULE_PORT);
    expect(config.projectConfig.loggerConfig?.prefix).toBe("user");
    expect(config.modules.user).toEqual({ resolve: "/abs/module", id: "user" });
  });

  test("reads environment for a database-backed module", () => {
    process.env.DATABASE_URL = "postgres://db";
    process.env.REDIS_URL = "redis://r";
    process.env.NODE_ENV = "production";
    process.env.HOST = "127.0.0.1";
    process.env.LOG_LEVEL = "fatal";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest: { ...manifest, paths: { models: "./models" } },
      moduleConfig: {},
    });
    expect(config.projectConfig.databaseUrl).toBe("postgres://db");
    expect(config.projectConfig.redisUrl).toBe("redis://r");
    expect(config.projectConfig.nodeEnv).toBe("production");
    expect(config.projectConfig.http.host).toBe("127.0.0.1");
    expect(config.projectConfig.loggerConfig?.level).toBe("fatal");
  });

  test("ignores DATABASE_URL for a service-only module", () => {
    process.env.DATABASE_URL = "postgres://unused";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest,
      moduleConfig: {},
    });
    expect(config.projectConfig.databaseUrl).toBeUndefined();
  });
});
