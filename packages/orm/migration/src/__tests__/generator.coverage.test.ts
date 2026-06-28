import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createInitialMigration } from "../generator/initialMigration";
import { createDiffMigration } from "../generator/diffMigration";

/**
 * Additional generator coverage closing the residual lines in
 * createDiffMigration:
 *   - the `mkdirSync(migrationsDir)` branch (migrations dir not yet created),
 *   - the warnings-logging loop (destructive change → processor warning).
 *
 * Same throwaway-module-dir technique as generator.test.ts; nothing touches the
 * repo tree. Each fixture lives under its own os.tmpdir() folder so Bun's
 * import() cache stays one-schema-per-dir.
 */

let tmpRoot: string;
let moduleCounter = 0;

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
  indexes: [],
  foreignKeys: [],
};

const postsTable = {
  name: "posts",
  columns: [{ name: "id", type: "text", primaryKey: true, nullable: false }],
  indexes: [],
  foreignKeys: [],
};

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-gen-cov-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("createDiffMigration — residual coverage", () => {
  it("creates the migrations dir when it does not exist yet (force, no prior snapshot)", async () => {
    // No createInitialMigration first → the module has no migrations/ dir, so
    // createDiffMigration must mkdir it. force=true makes it write a file even
    // though there is no previous snapshot to diff against.
    const moduleDir = writeFixtureModule({ User: usersTable });
    const migrationsDir = path.join(moduleDir, "migrations");
    expect(fs.existsSync(migrationsDir)).toBe(false);

    const result = await createDiffMigration("user", moduleDir, {
      force: true,
    });

    expect(fs.existsSync(migrationsDir)).toBe(true);
    // With no previous snapshot, every table is brand new → has changes.
    expect(result.filePath).not.toBeNull();
  });

  it("logs warnings emitted by the processor (dropping a table is destructive)", async () => {
    // Baseline has two tables; the diff schema drops `posts`, which the
    // processor flags with a destructive-change warning.
    const baselineDir = writeFixtureModule({
      User: usersTable,
      Post: postsTable,
    });
    await createInitialMigration("user", baselineDir);

    const diffDir = writeFixtureModule({ User: usersTable });
    copySnapshot(baselineDir, diffDir);

    const result = await createDiffMigration("user", diffDir);

    expect(result.hasChanges).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => /posts/.test(w))).toBe(true);
    // The drop appears in the generated migration body.
    const content = fs.readFileSync(result.filePath as string, "utf-8");
    expect(content).toMatch(/DROP TABLE/i);
  });
});
