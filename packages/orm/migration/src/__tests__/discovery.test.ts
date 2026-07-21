import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { discoverModuleMigrations } from "../discovery/moduleMigrations";
import { discoverAllMigrations } from "../discovery/allMigrations";
import { discoverModels } from "../discovery/models";

/**
 * Discovery tests use a real throwaway directory under os.tmpdir() rather than
 * mocking `node:fs`. This exercises the genuine readdir/sort/regex behaviour
 * and is cleaned up in afterEach — nothing is written into the repo tree.
 */

let tmpRoot: string;
let moduleCounter = 0;

/** Create a module dir with a `migrations/` folder containing the given files. */
function makeModule(files: string[]): string {
  const moduleDir = path.join(tmpRoot, `mod_${moduleCounter++}`);
  const migrationsDir = path.join(moduleDir, "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const f of files) {
    fs.writeFileSync(path.join(migrationsDir, f), "-- sql\n");
  }
  return moduleDir;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-disc-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("discoverModuleMigrations", () => {
  it("returns [] when the migrations directory does not exist", () => {
    const moduleDir = path.join(tmpRoot, "no-migrations");
    fs.mkdirSync(moduleDir, { recursive: true });
    expect(discoverModuleMigrations(moduleDir)).toEqual([]);
  });

  it("discovers Migration*.sql files and parses their timestamp", () => {
    const moduleDir = makeModule([
      "Migration20260316103000_Initial.sql",
      "Migration20260401120000_AddEmail.sql",
    ]);
    const result = discoverModuleMigrations(moduleDir);

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("Migration20260316103000_Initial");
    expect(result[0]!.timestamp).toBe(20260316103000);
    expect(result[0]!.applied).toBe(false);
    expect(result[0]!.resolver).toBe(moduleDir);
    expect(result[0]!.path).toBe(
      path.resolve(
        moduleDir,
        "migrations",
        "Migration20260316103000_Initial.sql",
      ),
    );
  });

  it("sorts results ascending by filename (timestamp order)", () => {
    const moduleDir = makeModule([
      "Migration20260401120000_B.sql",
      "Migration20260316103000_A.sql",
      "Migration20260501090000_C.sql",
    ]);
    const names = discoverModuleMigrations(moduleDir).map((m) => m.name);
    expect(names).toEqual([
      "Migration20260316103000_A",
      "Migration20260401120000_B",
      "Migration20260501090000_C",
    ]);
  });

  it("filters out non-migration files (snapshot json, other prefixes, non-sql)", () => {
    const moduleDir = makeModule([
      "Migration20260316103000_Initial.sql",
      "schema-snapshot.json",
      "README.md",
      "NotAMigration.sql",
      "Migration20260401120000_Good.txt",
    ]);
    const names = discoverModuleMigrations(moduleDir).map((m) => m.name);
    expect(names).toEqual(["Migration20260316103000_Initial"]);
  });

  it("falls back to timestamp 0 when the filename has no numeric segment", () => {
    // "Migration_Weird.sql" starts with Migration and ends with .sql but has
    // no digits, so the regex match fails and timestamp defaults to 0.
    const moduleDir = makeModule(["Migration_Weird.sql"]);
    const result = discoverModuleMigrations(moduleDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.timestamp).toBe(0);
  });

  it("returns [] for an empty migrations directory", () => {
    const moduleDir = makeModule([]);
    expect(discoverModuleMigrations(moduleDir)).toEqual([]);
  });
});

describe("discoverAllMigrations", () => {
  it("merges migrations from multiple modules sorted by timestamp ascending", () => {
    const modA = makeModule([
      "Migration20260401120000_A2.sql",
      "Migration20260101000000_A1.sql",
    ]);
    const modB = makeModule([
      "Migration20260301000000_B1.sql",
      "Migration20260501000000_B2.sql",
    ]);

    const result = discoverAllMigrations([modA, modB]);
    expect(result.map((m) => m.timestamp)).toEqual([
      20260101000000, 20260301000000, 20260401120000, 20260501000000,
    ]);
    // Sanity: each migration retains its originating module resolver.
    const a1 = result.find((m) => m.name === "Migration20260101000000_A1");
    expect(a1!.resolver).toBe(modA);
  });

  it("returns [] for an empty module list", () => {
    expect(discoverAllMigrations([])).toEqual([]);
  });

  it("skips modules with no migrations directory", () => {
    const withMigrations = makeModule(["Migration20260101000000_X.sql"]);
    const empty = path.join(tmpRoot, "empty-module");
    fs.mkdirSync(empty, { recursive: true });

    const result = discoverAllMigrations([withMigrations, empty]);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Migration20260101000000_X");
  });
});

describe("discoverModels", () => {
  function writeModelsModule(body: string): string {
    const dir = path.join(tmpRoot, `models_${moduleCounter++}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.ts"), body);
    return dir;
  }

  it("imports the module and returns Object.values(models)", async () => {
    const dir = writeModelsModule(
      `export const models = { User: { name: "user" }, Order: { name: "order" } };`,
    );
    const models = await discoverModels(dir);
    expect(models).toHaveLength(2);
    expect(models).toEqual([{ name: "user" }, { name: "order" }]);
  });

  it("throws and logs when no models are defined", async () => {
    const dir = writeModelsModule(`export const models = {};`);
    const errors: string[] = [];
    const logger = {
      error: (m: string) => errors.push(m),
      info: () => {},
    } as any;

    await expect(discoverModels(dir, logger)).rejects.toThrow(
      "No Model has been defined",
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("No Model has been defined");
  });

  it("logs an info line with the discovered model count", async () => {
    const dir = writeModelsModule(
      `export const models = { A: {}, B: {}, C: {} };`,
    );
    const infos: string[] = [];
    const logger = {
      error: () => {},
      info: (m: string) => infos.push(m),
    } as any;

    const models = await discoverModels(dir, logger);
    expect(models).toHaveLength(3);
    expect(infos.some((m) => m.includes("Discovered 3 model(s)"))).toBe(true);
  });

  it("works without a logger argument", async () => {
    const dir = writeModelsModule(`export const models = { Solo: {} };`);
    const models = await discoverModels(dir);
    expect(models).toHaveLength(1);
  });
});
