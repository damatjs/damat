import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import { loadModules } from "../cli/utils/load";
import { requireDatabaseUrl } from "../cli/config/index";

describe("loadModules", () => {
  const tempDir = path.join(process.cwd(), ".test-config-temp");
  const configPath = path.join(tempDir, "damat.config.ts");

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("throws when config file does not exist", async () => {
    await expect(
      loadModules(path.join(tempDir, "missing.config.ts")),
    ).rejects.toThrow("Config file not found");
  });

  it("returns empty object when modules array is empty", async () => {
    fs.writeFileSync(
      configPath,
      `export default { projectConfig: {}, modules: [] };`,
    );
    const modules = await loadModules(configPath);
    expect(Object.keys(modules).length).toBe(0);
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
