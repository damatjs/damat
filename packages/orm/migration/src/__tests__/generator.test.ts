import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createInitialMigration } from "../generator/initialMigration";
import { createDiffMigration } from "../generator/diffMigration";

/**
 * Generator tests.
 *
 * `createInitialMigration` / `createDiffMigration` orchestrate the PURE
 * processor pipeline (diffSchemas → generateFromDiff/Snapshot → template)
 * with a small amount of filesystem IO (mkdir, writeFileSync, snapshot
 * persistence) and a dynamic `import()` of the module's `models` export.
 *
 * To exercise them without touching the repo tree we:
 *   - create a throwaway module directory under os.tmpdir(),
 *   - write a fixture `index.ts` that exports duck-typed `models`
 *     (objects with `toTableSchema()` — all `toModuleSchema` needs),
 *   - point `moduleResolver` at the fixture and assert on the written file.
 *
 * IMPORTANT: Bun caches dynamic `import()` by path, so a given module
 * directory can only be imported with ONE schema version per process. Tests
 * that need two schema versions (baseline → diff) therefore use two distinct
 * module directories and copy the baseline snapshot between them.
 */

let tmpRoot: string;
let moduleCounter = 0;

// Each fixture model is a plain object satisfying ModelDefinition's
// structural contract used by toModuleSchema(): a `toTableSchema()` method.
// Returns a fresh, uniquely-named module directory so each import() is distinct.
function writeFixtureModule(tables: Record<string, unknown>): string {
  const dir = path.join(tmpRoot, `mod_${moduleCounter++}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "index.ts");
  const entries = Object.entries(tables)
    .map(
      ([key, schema]) =>
        `  ${key}: { toTableSchema: () => (${JSON.stringify(schema)}) },`,
    )
    .join("\n");
  fs.writeFileSync(file, `export const models = {\n${entries}\n};\n`);
  return dir;
}

// Copy a persisted snapshot from one module dir to another so a diff run in
// the second dir sees the first dir's schema as its "previous" state.
function copySnapshot(fromModuleDir: string, toModuleDir: string): void {
  const toMigrations = path.join(toModuleDir, "migrations");
  fs.mkdirSync(toMigrations, { recursive: true });
  fs.copyFileSync(
    path.join(fromModuleDir, "migrations", "schema-snapshot.json"),
    path.join(toMigrations, "schema-snapshot.json"),
  );
}

const usersTable = {
  name: "users",
  columns: [
    { name: "id", type: "text", primaryKey: true, nullable: false },
    { name: "email", type: "text", nullable: false, unique: true },
  ],
  indexes: [{ name: "idx_users_email", columns: ["email"], unique: true }],
  foreignKeys: [],
};

const usersTableWithName = {
  ...usersTable,
  columns: [
    ...usersTable.columns,
    { name: "name", type: "text", nullable: true },
  ],
};

function readMigration(dir: string): { file: string; content: string } {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith("Migration") && f.endsWith(".sql"));
  expect(files.length).toBe(1);
  const file = files[0]!;
  return { file, content: fs.readFileSync(path.join(dir, file), "utf-8") };
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-gen-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("createInitialMigration", () => {
  it("throws when the module resolver path does not exist", async () => {
    await expect(
      createInitialMigration("user", path.join(tmpRoot, "missing")),
    ).rejects.toThrow("Module 'user' not found");
  });

  it("creates the migrations dir, writes a baseline migration and a snapshot", async () => {
    const moduleDir = writeFixtureModule({ User: usersTable });

    const filePath = await createInitialMigration("user", moduleDir);
    const migrationsDir = path.join(moduleDir, "migrations");

    // Returned path points into the migrations dir with the expected naming.
    expect(filePath.startsWith(migrationsDir)).toBe(true);
    expect(path.basename(filePath)).toMatch(/^Migration\d{14}_Initial\.sql$/);

    // Snapshot persisted.
    expect(
      fs.existsSync(path.join(migrationsDir, "schema-snapshot.json")),
    ).toBe(true);

    const { content } = readMigration(migrationsDir);
    expect(content).toContain("-- Migration: Initial");
    expect(content).toContain("-- Module: user");
    // Baseline CREATE TABLE + the unique index.
    expect(content).toContain('CREATE TABLE IF NOT EXISTS "public"."users"');
    expect(content).toContain('"id" TEXT PRIMARY KEY');
    expect(content).toContain('"email" TEXT NOT NULL UNIQUE');
    expect(content).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email"',
    );
  });

  it("snapshot reflects the current schema (one table)", async () => {
    const moduleDir = writeFixtureModule({ User: usersTable });

    await createInitialMigration("user", moduleDir);
    const snap = JSON.parse(
      fs.readFileSync(
        path.join(moduleDir, "migrations", "schema-snapshot.json"),
        "utf-8",
      ),
    );
    expect(snap.moduleName).toBe("user");
    expect(snap.tables).toHaveLength(1);
    expect(snap.tables[0].name).toBe("users");
  });
});

describe("createDiffMigration", () => {
  it("throws when the module resolver path does not exist", async () => {
    await expect(
      createDiffMigration("user", path.join(tmpRoot, "missing")),
    ).rejects.toThrow("Module 'user' not found");
  });

  it("returns hasChanges=false and writes nothing when schema is unchanged", async () => {
    // Baseline AND diff use the same schema, so the same module dir is fine.
    const moduleDir = writeFixtureModule({ User: usersTable });

    // Establish a baseline snapshot first.
    await createInitialMigration("user", moduleDir);
    const migrationsDir = path.join(moduleDir, "migrations");
    const before = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"));

    const result = await createDiffMigration("user", moduleDir);

    expect(result.hasChanges).toBe(false);
    expect(result.filePath).toBeNull();
    expect(result.migration).toBeNull();
    // No new migration file was written.
    const after = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"));
    expect(after).toEqual(before);
  });

  it("writes a diff migration with only the changes when schema differs", async () => {
    // Baseline (v1) lives in its own dir; diff (v2) in another so import() is fresh.
    const baselineDir = writeFixtureModule({ User: usersTable });
    await createInitialMigration("user", baselineDir);

    const diffDir = writeFixtureModule({ User: usersTableWithName });
    copySnapshot(baselineDir, diffDir); // diff sees v1 as "previous"
    const result = await createDiffMigration("user", diffDir);

    expect(result.hasChanges).toBe(true);
    expect(result.filePath).not.toBeNull();
    expect(result.migration).not.toBeNull();
    expect(result.migration!.upStatements).toContain(
      'ALTER TABLE "public"."users" ADD COLUMN "name" TEXT NULL',
    );
    expect(result.diff.changes.some((c) => c.type === "add_column")).toBe(true);

    const content = fs.readFileSync(result.filePath as string, "utf-8");
    expect(content).toContain('ALTER TABLE "public"."users" ADD COLUMN "name"');
  });

  it("force=true writes a migration even without changes", async () => {
    const moduleDir = writeFixtureModule({ User: usersTable });
    await createInitialMigration("user", moduleDir);

    const result = await createDiffMigration("user", moduleDir, {
      force: true,
    });
    expect(result.hasChanges).toBe(false); // diff truly has no changes
    expect(result.filePath).not.toBeNull(); // but force wrote a file anyway
    const content = fs.readFileSync(result.filePath as string, "utf-8");
    expect(content).toContain("-- No changes detected");
  });

  it("updateSnapshot=false leaves the previous snapshot untouched", async () => {
    const baselineDir = writeFixtureModule({ User: usersTable });
    await createInitialMigration("user", baselineDir);

    const diffDir = writeFixtureModule({ User: usersTableWithName });
    copySnapshot(baselineDir, diffDir);
    const snapPath = path.join(diffDir, "migrations", "schema-snapshot.json");
    const snapBefore = fs.readFileSync(snapPath, "utf-8");

    await createDiffMigration("user", diffDir, { updateSnapshot: false });

    // Snapshot should still describe the OLD schema (no `name` column).
    expect(fs.readFileSync(snapPath, "utf-8")).toBe(snapBefore);
    // The literal `name` column would serialise as `"name": "name"`.
    expect(snapBefore).not.toContain('"name": "name"');
  });

  it("updateSnapshot default (true) persists the new schema after a diff", async () => {
    const baselineDir = writeFixtureModule({ User: usersTable });
    await createInitialMigration("user", baselineDir);

    const diffDir = writeFixtureModule({ User: usersTableWithName });
    copySnapshot(baselineDir, diffDir);
    await createDiffMigration("user", diffDir);

    const snap = fs.readFileSync(
      path.join(diffDir, "migrations", "schema-snapshot.json"),
      "utf-8",
    );
    // The literal `name` column should now be present in the persisted snapshot.
    expect(snap).toContain('"name": "name"');
  });
});
