import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import { loadModules, loadDatabaseUrl } from "../cli/utils/load";
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

  // Isolation sanity check: two DIFFERENT configs loaded concurrently in the
  // same instant must each return their OWN value (no cross-contamination via a
  // shared sidecar/module). NOTE: the real timestamp-collision regression is
  // the "reloads fresh contents for the same path" test below — distinct paths
  // already never collided under the old key, so this test alone doesn't guard
  // the bug.
  it("does not collide two different configs loaded in the same instant", async () => {
    const configA = path.join(tempDir, "a.config.ts");
    const configB = path.join(tempDir, "b.config.ts");
    fs.writeFileSync(
      configA,
      `export default {
         projectConfig: { databaseUrl: "postgres://a/dba" },
         modules: { alpha: { resolve: "./modules/alpha" } },
       };`,
    );
    fs.writeFileSync(
      configB,
      `export default {
         projectConfig: { databaseUrl: "postgres://b/dbb" },
         modules: { beta: { resolve: "./modules/beta" } },
       };`,
    );

    // Pin Date.now() so both loads observe the exact same millisecond — the old
    // `?t=${Date.now()}` key would have been identical-by-timestamp.
    const realNow = Date.now;
    Date.now = () => 1_700_000_000_000;
    try {
      const [modsA, modsB] = await Promise.all([
        loadModules<Record<string, any>>(configA),
        loadModules<Record<string, any>>(configB),
      ]);
      const [dbA, dbB] = await Promise.all([
        loadDatabaseUrl(configA),
        loadDatabaseUrl(configB),
      ]);

      // Each config resolves to its OWN modules, not a collided/shared one.
      expect(Object.keys(modsA)).toEqual(["alpha"]);
      expect(Object.keys(modsB)).toEqual(["beta"]);
      expect(dbA.databaseUrl).toBe("postgres://a/dba");
      expect(dbB.databaseUrl).toBe("postgres://b/dbb");
    } finally {
      Date.now = realNow;
    }
  });

  // Regression: editing the SAME config and reloading it within the same
  // millisecond must return the FRESH contents, not a stale cached module.
  it("reloads fresh contents for the same path within one instant", async () => {
    fs.writeFileSync(
      configPath,
      `export default { projectConfig: { databaseUrl: "postgres://before/x" } };`,
    );

    const realNow = Date.now;
    Date.now = () => 1_700_000_000_000;
    try {
      const before = await loadDatabaseUrl(configPath);
      expect(before.databaseUrl).toBe("postgres://before/x");

      // Same path, same frozen instant — only the file contents change.
      fs.writeFileSync(
        configPath,
        `export default { projectConfig: { databaseUrl: "postgres://after/y" } };`,
      );
      const after = await loadDatabaseUrl(configPath);
      expect(after.databaseUrl).toBe("postgres://after/y");
    } finally {
      Date.now = realNow;
    }
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
