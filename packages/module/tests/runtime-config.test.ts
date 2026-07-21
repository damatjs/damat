import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  defineModuleConfig,
  buildModuleAppConfig,
  DEFAULT_MODULE_PORT,
  loadModuleConfig,
  locateModuleDir,
} from "../src";
import type { ModuleManifest } from "../src";
import { resolveDatabaseConfig } from "../src/harness/database";

function tmpDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

const baseManifest: ModuleManifest = { name: "user" } as ModuleManifest;

// --- env isolation ----------------------------------------------------------
const ENV_KEYS = [
  "DATABASE_URL",
  "REDIS_URL",
  "NODE_ENV",
  "HOST",
  "PORT",
] as const;

let savedEnv: Record<string, string | undefined>;
beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe("defineModuleConfig", () => {
  test("returns the config object unchanged (identity helper)", () => {
    const cfg = { projectConfig: { nodeEnv: "production" as const } };
    expect(defineModuleConfig(cfg)).toBe(cfg);
  });
});

describe("buildModuleAppConfig", () => {
  test("applies standalone defaults when nothing is overridden", () => {
    const config = buildModuleAppConfig({
      moduleDir: "/abs/module",
      manifest: baseManifest,
      moduleConfig: {},
    });
    expect(config.projectConfig.databaseUrl).toBe("");
    expect(config.projectConfig.redisUrl).toBeUndefined();
    expect(config.projectConfig.nodeEnv).toBe("development");
    expect(config.projectConfig.http?.host).toBe("0.0.0.0");
    expect(config.projectConfig.http?.port).toBe(DEFAULT_MODULE_PORT);
    expect(config.projectConfig.loggerConfig?.prefix).toBe("user");
    expect(config.modules.user).toEqual({ resolve: "/abs/module", id: "user" });
  });

  test("reads database/redis/nodeEnv/host from the environment", () => {
    process.env.DATABASE_URL = "postgres://db";
    process.env.REDIS_URL = "redis://r";
    process.env.NODE_ENV = "production";
    process.env.HOST = "127.0.0.1";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest: baseManifest,
      moduleConfig: {},
    });
    expect(config.projectConfig.databaseUrl).toBe("postgres://db");
    expect(config.projectConfig.redisUrl).toBe("redis://r");
    expect(config.projectConfig.nodeEnv).toBe("production");
    expect(config.projectConfig.http?.host).toBe("127.0.0.1");
  });

  test("port precedence: explicit port wins over PORT env and config", () => {
    process.env.PORT = "5000";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest: baseManifest,
      moduleConfig: { projectConfig: { http: { port: 6000 } } },
      port: 4000,
    });
    expect(config.projectConfig.http?.port).toBe(4000);
  });

  test("port precedence: PORT env wins over config when no explicit port", () => {
    process.env.PORT = "5000";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest: baseManifest,
      moduleConfig: { projectConfig: { http: { port: 6000 } } },
    });
    expect(config.projectConfig.http?.port).toBe(5000);
  });

  test("port precedence: config http.port wins when no explicit/env port", () => {
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest: baseManifest,
      moduleConfig: { projectConfig: { http: { port: 6000 } } },
    });
    expect(config.projectConfig.http?.port).toBe(6000);
  });

  test("merges projectConfig overrides and http overrides", () => {
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest: baseManifest,
      moduleConfig: {
        projectConfig: {
          nodeEnv: "test",
          http: { host: "example.com" },
        },
      },
    });
    expect(config.projectConfig.nodeEnv).toBe("test");
    expect(config.projectConfig.http?.host).toBe("example.com");
    expect(config.projectConfig.http?.port).toBe(DEFAULT_MODULE_PORT);
  });
});

describe("loadModuleConfig", () => {
  test("returns an empty config when no module.config file exists", async () => {
    const dir = tmpDir("damat-cfg-empty-");
    try {
      expect(await loadModuleConfig(dir)).toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("loads a default-exported config", async () => {
    const dir = tmpDir("damat-cfg-default-");
    try {
      writeFileSync(
        join(dir, "module.config.ts"),
        "export default { projectConfig: { nodeEnv: 'production' } };\n",
      );
      const cfg = await loadModuleConfig(dir);
      expect(cfg.projectConfig?.nodeEnv).toBe("production");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("falls back to a named `config` export", async () => {
    const dir = tmpDir("damat-cfg-named-");
    try {
      writeFileSync(
        join(dir, "module.config.ts"),
        "export const config = { projectConfig: { nodeEnv: 'test' } };\n",
      );
      const cfg = await loadModuleConfig(dir);
      expect(cfg.projectConfig?.nodeEnv).toBe("test");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws when the config file exports a non-object", async () => {
    const dir = tmpDir("damat-cfg-bad-");
    try {
      writeFileSync(join(dir, "module.config.ts"), "export default 42;\n");
      await expect(loadModuleConfig(dir)).rejects.toThrow(
        "must default-export defineModuleConfig",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("locateModuleDir", () => {
  test("finds module.json inside src/", () => {
    const dir = tmpDir("damat-locate-src-");
    try {
      mkdirSync(join(dir, "src"));
      writeFileSync(join(dir, "src", "module.json"), "{}");
      expect(locateModuleDir(dir)).toBe(join(dir, "src"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("finds module.json at the package root (legacy layout)", () => {
    const dir = tmpDir("damat-locate-root-");
    try {
      writeFileSync(join(dir, "module.json"), "{}");
      expect(locateModuleDir(dir)).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws when no module.json is found anywhere", () => {
    const dir = tmpDir("damat-locate-none-");
    try {
      expect(() => locateModuleDir(dir)).toThrow("not a damat module package");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("resolveDatabaseConfig", () => {
  test("explicit database config wins", () => {
    const database = { connectionString: "postgres://explicit", max: 9 } as any;
    expect(resolveDatabaseConfig({ database })).toBe(database);
  });

  test("uses options.databaseUrl with test pool defaults", () => {
    const cfg = resolveDatabaseConfig({ databaseUrl: "postgres://opt" });
    expect(cfg.connectionString).toBe("postgres://opt");
    expect(cfg.max).toBe(2); // testPoolConfig default
  });

  test("falls back to DATABASE_URL env var", () => {
    process.env.DATABASE_URL = "postgres://env";
    const cfg = resolveDatabaseConfig({});
    expect(cfg.connectionString).toBe("postgres://env");
  });

  test("throws when no database source is available", () => {
    expect(() => resolveDatabaseConfig({})).toThrow(
      "bootModule needs a database",
    );
  });
});
