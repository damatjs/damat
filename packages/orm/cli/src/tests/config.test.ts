import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import { loadConfig, clearConfigCache, requireDatabaseUrl } from "../cli/config/index";
import type { DamatConfig } from "../cli/config/index";

describe("loadConfig", () => {
  const tempDir = path.join(process.cwd(), ".test-config-temp");

  beforeEach(() => {
    clearConfigCache();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    clearConfigCache();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns empty object when no config file exists", async () => {
    const config = await loadConfig(tempDir);
    expect(config).toEqual({});
  });

  it("caches config after first load", async () => {
    const config1 = await loadConfig(tempDir);
    const config2 = await loadConfig(tempDir);

    expect(config1).toBe(config2);
  });

  it("clearConfigCache resets cached config", async () => {
    await loadConfig(tempDir);
    clearConfigCache();

    const newConfig = await loadConfig(tempDir);
    expect(newConfig).toEqual({});
  });
});

describe("requireDatabaseUrl", () => {
  const originalDbUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDbUrl !== undefined) {
      process.env.DATABASE_URL = originalDbUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it("returns DATABASE_URL when set", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";

    const mockLogger = {
      error: () => {},
      info: () => {},
      success: () => {},
      warn: () => {},
      skip: () => {},
    };

    const result = requireDatabaseUrl(mockLogger as any);
    expect(result).toBe("postgresql://user:pass@localhost:5432/testdb");
  });
});

describe("DamatConfig interface", () => {
  it("accepts valid config object", () => {
    const config: DamatConfig = {
      user: {
        resolve: "./src/modules/user",
        id: "user-module",
      },
      product: {
        resolve: "./src/modules/product",
      },
    };

    expect(config.user?.resolve).toBe("./src/modules/user");
    expect(config.product?.resolve).toBe("./src/modules/product");
  });

  it("accepts empty config object", () => {
    const config: DamatConfig = {};
    expect(Object.keys(config).length).toBe(0);
  });

  it("accepts config with options", () => {
    const config: DamatConfig = {
      auth: {
        resolve: "./src/modules/auth",
        options: { tableName: "users" },
      },
    };

    expect(config.auth?.resolve).toBe("./src/modules/auth");
    expect(config.auth?.options?.tableName).toBe("users");
  });
});
