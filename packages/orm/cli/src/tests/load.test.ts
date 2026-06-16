import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import { loadModules, loadDatabaseUrl } from "../cli/utils/load";

/**
 * These tests exercise the real config-loading logic in
 * `src/cli/utils/load.ts` using throwaway temp directories that contain real
 * `damat.config.ts` files. No database and no real project are involved — the
 * config files only describe module paths and database connection settings.
 */

const tempRoot = path.join(process.cwd(), ".test-load-temp");

function writeConfig(name: string, contents: string): string {
  const filePath = path.join(tempRoot, name);
  fs.writeFileSync(filePath, contents, "utf-8");
  return filePath;
}

beforeEach(() => {
  fs.mkdirSync(tempRoot, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

// NOTE: src/cli/utils/load.ts cache-busts dynamic imports with `?t=${Date.now()}`,
// which has millisecond resolution. Reusing the SAME config filename across
// tests that run sub-millisecond apart can return a stale cached module, so
// every test here uses a UNIQUE config filename (or a unique directory). This
// is a deliberate test-isolation measure around a real source robustness gap.
describe("loadModules - success paths", () => {
  it("maps modules keyed by object key and resolves relative paths against the config dir", async () => {
    const configPath = writeConfig(
      "mods-relative.config.ts",
      `export default {
         projectConfig: {},
         modules: {
           user: { resolve: "./src/modules/user" },
           post: { resolve: "./src/modules/post" },
         },
       };`,
    );

    const modules = await loadModules<Record<string, any>>(configPath);

    expect(Object.keys(modules).sort()).toEqual(["post", "user"]);
    // Relative paths are resolved against the directory containing the config.
    expect(modules.user.resolve).toBe(
      path.resolve(tempRoot, "./src/modules/user"),
    );
    expect(modules.post.resolve).toBe(
      path.resolve(tempRoot, "./src/modules/post"),
    );
    // The original (un-resolved) path is preserved on `path`.
    expect(modules.user.path).toBe("./src/modules/user");
    // The name carries the object key, id defaults to the key.
    expect(modules.user.name).toBe("user");
    expect(modules.user.id).toBe("user");
  });

  it("uses an explicit `id` over the object key", async () => {
    const configPath = writeConfig(
      "mods-id.config.ts",
      `export default {
         modules: {
           userModule: { id: "users", resolve: "./modules/users" },
         },
       };`,
    );

    const modules = await loadModules<Record<string, any>>(configPath);

    // Map is keyed by the explicit id, not the object key.
    expect(Object.keys(modules)).toEqual(["users"]);
    expect(modules.users.id).toBe("users");
    // `name` retains the original object key.
    expect(modules.users.name).toBe("userModule");
  });

  it("keeps absolute module resolve paths untouched", async () => {
    const abs = path.join(tempRoot, "absolute", "module");
    const configPath = writeConfig(
      "mods-absolute.config.ts",
      `export default {
         modules: {
           billing: { resolve: ${JSON.stringify(abs)} },
         },
       };`,
    );

    const modules = await loadModules<Record<string, any>>(configPath);
    expect(modules.billing.resolve).toBe(abs);
  });

  it("resolves a relative configPath against the provided cwd", async () => {
    // Use a dedicated subdir so the file URL (and cache key) is unique even
    // though the filename must be the conventional damat.config.ts.
    const subDir = path.join(tempRoot, "rel-cwd");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(
      path.join(subDir, "damat.config.ts"),
      `export default {
         modules: { user: { resolve: "./modules/user" } },
       };`,
      "utf-8",
    );

    // Pass just the filename + cwd; the function must join them.
    const modules = await loadModules<Record<string, any>>(
      "damat.config.ts",
      subDir,
    );
    expect(modules.user.resolve).toBe(path.resolve(subDir, "./modules/user"));
  });
});

describe("loadModules - error paths", () => {
  it("throws a 'Config file not found' error for a missing relative file", async () => {
    await expect(loadModules("nope.config.ts", tempRoot)).rejects.toThrow(
      /Config file not found/,
    );
  });

  it("wraps load failures (invalid config shape) in a descriptive error", async () => {
    // `config.modules` is undefined -> Object.keys(undefined) throws inside the
    // try block and gets wrapped (not the 'Config file not found' path).
    const configPath = writeConfig(
      "mods-invalid.config.ts",
      `export default { projectConfig: {} };`,
    );

    await expect(loadModules(configPath)).rejects.toThrow(
      /Failed to load config from/,
    );
  });
});

describe("loadDatabaseUrl", () => {
  it("throws when the config file is missing", async () => {
    await expect(
      loadDatabaseUrl(path.join(tempRoot, "missing.config.ts")),
    ).rejects.toThrow(/Config file not found/);
  });

  it("prefers projectConfig.databaseUrl", async () => {
    const configPath = writeConfig(
      "db1.config.ts",
      `export default {
         projectConfig: { databaseUrl: "postgres://a:b@host:5432/db" },
         services: { database: { connectionString: "postgres://ignored/x" } },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe("postgres://a:b@host:5432/db");
  });

  it("falls back to services.database.connectionString", async () => {
    const configPath = writeConfig(
      "db2.config.ts",
      `export default {
         services: { database: { connectionString: "postgres://conn/string" } },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe("postgres://conn/string");
  });

  it("builds a connection string from individual fields and url-encodes secrets", async () => {
    const configPath = writeConfig(
      "db3.config.ts",
      `export default {
         services: {
           database: {
             host: "db.example.com",
             port: 6543,
             user: "admin",
             password: "p@ss/word",
             database: "my db",
           },
         },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe(
      "postgres://admin:p%40ss%2Fword@db.example.com:6543/my%20db",
    );
  });

  it("applies defaults for omitted fields when only `database` is given", async () => {
    const configPath = writeConfig(
      "db4.config.ts",
      `export default {
         services: { database: { database: "appdb" } },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    // Defaults: host=localhost, port=5432, user=postgres, password=""
    expect(result.databaseUrl).toBe(
      "postgres://postgres:@localhost:5432/appdb",
    );
  });

  it("appends ssl=true when ssl is the boolean true", async () => {
    const configPath = writeConfig(
      "db5.config.ts",
      `export default {
         services: { database: { host: "h", database: "d", ssl: true } },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe(
      "postgres://postgres:@h:5432/d?ssl=true",
    );
  });

  it("encodes an ssl object as a JSON query param", async () => {
    const configPath = writeConfig(
      "db6.config.ts",
      `export default {
         services: {
           database: { host: "h", database: "d", ssl: { rejectUnauthorized: false } },
         },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    const expectedSsl = encodeURIComponent(
      JSON.stringify({ rejectUnauthorized: false }),
    );
    expect(result.databaseUrl).toBe(
      `postgres://postgres:@h:5432/d?ssl=${expectedSsl}`,
    );
  });

  it("does NOT build a connection string when neither host nor database is set", async () => {
    const configPath = writeConfig(
      "db7.config.ts",
      `export default {
         services: { database: { user: "only-user" } },
       };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe("");
  });

  it("returns an empty databaseUrl when there is no db config at all", async () => {
    const configPath = writeConfig(
      "db8.config.ts",
      `export default { projectConfig: {} };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe("");
  });

  it("supports a module-style config without a default export", async () => {
    // No `default` export — the loader falls back to the module namespace.
    const configPath = writeConfig(
      "db9.config.ts",
      `export const projectConfig = { databaseUrl: "postgres://named/export" };`,
    );

    const result = await loadDatabaseUrl(configPath);
    expect(result.databaseUrl).toBe("postgres://named/export");
  });
});
