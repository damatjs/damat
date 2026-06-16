import { describe, it, expect } from "bun:test";
import { getMigrationTemplateWithSQL } from "../utils/template";
import type { GeneratedMigration } from "@damatjs/orm-processor";

const baseMigration = (over: Partial<GeneratedMigration> = {}): GeneratedMigration => ({
  upStatements: [],
  description: "No changes",
  warnings: [],
  ...over,
});

describe("getMigrationTemplateWithSQL", () => {
  const created = new Date("2026-03-16T10:30:00.000Z");

  it("renders the header block with name, module and ISO timestamp", () => {
    const out = getMigrationTemplateWithSQL(
      "Migration1_User",
      "User",
      "user",
      created,
      baseMigration({ upStatements: ["CREATE TABLE x (id text)"], description: "1 table created" }),
    );
    expect(out).toContain("-- Migration: User");
    expect(out).toContain("-- Module: user");
    expect(out).toContain("-- Created: 2026-03-16T10:30:00.000Z");
    expect(out).toContain("-- 1 table created");
    expect(out).toContain(
      "-- This migration was auto-generated based on schema changes.",
    );
    expect(out).toContain(
      "-- Review the SQL statements before running in production.",
    );
  });

  it("emits each up statement, joined by a blank line", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      baseMigration({ upStatements: ["CREATE TABLE a (id text)", "CREATE TABLE b (id text)"] }),
    );
    expect(out).toContain("CREATE TABLE a (id text);\n\nCREATE TABLE b (id text);");
  });

  it("appends a trailing semicolon when a statement lacks one", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      baseMigration({ upStatements: ["CREATE TABLE x (id text)"] }),
    );
    expect(out).toContain("CREATE TABLE x (id text);");
    // Exactly one terminating semicolon — not doubled.
    expect(out).not.toContain("CREATE TABLE x (id text);;");
  });

  it("does NOT double the semicolon when a statement already ends with one", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      baseMigration({ upStatements: ["ALTER TABLE x ADD y text;"] }),
    );
    expect(out).toContain("ALTER TABLE x ADD y text;");
    expect(out).not.toContain("ALTER TABLE x ADD y text;;");
  });

  it("treats trailing whitespace after a semicolon as already-terminated", () => {
    // stmt.trim().endsWith(";") — so "...;  " should not gain a second ";"
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      baseMigration({ upStatements: ["SELECT 1;  "] }),
    );
    expect(out).not.toContain(";;");
  });

  it("falls back to a placeholder when there are no up statements", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "Init",
      "user",
      created,
      baseMigration({ upStatements: [], description: "No changes" }),
    );
    expect(out).toContain("-- No changes detected");
  });

  it("renders warning comments before the body when warnings exist", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      baseMigration({
        upStatements: ["DROP TABLE users"],
        warnings: ["Dropping table 'users' will delete all data in it", "second warning"],
      }),
    );
    expect(out).toContain("-- WARNING: Dropping table 'users' will delete all data in it");
    expect(out).toContain("-- WARNING: second warning");
    // The warning block should appear before the auto-generated note.
    const warnIdx = out.indexOf("-- WARNING:");
    const noteIdx = out.indexOf("-- This migration was auto-generated");
    expect(warnIdx).toBeGreaterThanOrEqual(0);
    expect(warnIdx).toBeLessThan(noteIdx);
  });

  it("omits the warning block entirely when there are no warnings", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      baseMigration({ upStatements: ["CREATE TABLE x (id text)"], warnings: [] }),
    );
    expect(out).not.toContain("-- WARNING:");
  });

  it("produces a stable full document for a representative migration", () => {
    const out = getMigrationTemplateWithSQL(
      "Migration1_User",
      "User",
      "user",
      created,
      baseMigration({
        upStatements: ["CREATE TABLE x (id text)", "ALTER TABLE x ADD y text;"],
        description: "1 table created",
        warnings: ["destructive!"],
      }),
    );
    expect(out).toBe(
      `-- Migration: User
-- Module: user
-- Created: 2026-03-16T10:30:00.000Z
--
-- 1 table created
--
-- WARNING: destructive!
--
-- This migration was auto-generated based on schema changes.
-- Review the SQL statements before running in production.

CREATE TABLE x (id text);

ALTER TABLE x ADD y text;
`,
    );
  });
});
