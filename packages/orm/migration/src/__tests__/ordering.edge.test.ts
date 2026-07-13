import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { discoverModuleMigrations } from "../discovery/moduleMigrations";
import { discoverAllMigrations } from "../discovery/allMigrations";
import { generateTimestamp } from "../utils/timestamp";
import { getMigrationTemplateWithSQL } from "../utils/template";
import type { GeneratedMigration } from "@damatjs/orm-processor";

/**
 * Edge-case coverage for migration ORDERING (the critical path), plus a couple
 * of timestamp/template formatting corners not already covered.
 *
 * Discovery uses real throwaway directories under os.tmpdir() so the genuine
 * readdir/sort/regex code runs; cleaned up in afterEach.
 */

let tmpRoot: string;
let moduleCounter = 0;

function makeModule(files: string[]): string {
  const dir = path.join(tmpRoot, `mod_${moduleCounter++}`);
  const migrationsDir = path.join(dir, "migrations");
  fs.mkdirSync(migrationsDir, { recursive: true });
  for (const f of files) {
    fs.writeFileSync(path.join(migrationsDir, f), "-- sql\n");
  }
  return dir;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-mig-order-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("discoverModuleMigrations — ordering edge cases", () => {
  it("orders by numeric timestamp even when discovered in reverse on disk", () => {
    const dir = makeModule([
      "Migration20260501090000_C.sql",
      "Migration20260101000000_A.sql",
      "Migration20260401120000_B.sql",
    ]);
    expect(discoverModuleMigrations(dir).map((m) => m.name)).toEqual([
      "Migration20260101000000_A",
      "Migration20260401120000_B",
      "Migration20260501090000_C",
    ]);
  });

  it("breaks same-timestamp ties deterministically by filename (label asc)", () => {
    const dir = makeModule([
      "Migration20260101000000_Zebra.sql",
      "Migration20260101000000_Apple.sql",
      "Migration20260101000000_Mango.sql",
    ]);
    expect(discoverModuleMigrations(dir).map((m) => m.name)).toEqual([
      "Migration20260101000000_Apple",
      "Migration20260101000000_Mango",
      "Migration20260101000000_Zebra",
    ]);
  });

  it("places a timestamp-less migration (regex miss -> 0) BEFORE real ones, consistently", () => {
    // "Migration_Weird" has no digits, so timestamp falls back to 0. Numeric
    // ordering must put it first. (A naive lexical .sort() would put the '_'
    // after the digits and mis-order it last.)
    const dir = makeModule([
      "Migration20260101000000_Real.sql",
      "Migration_Weird.sql",
    ]);
    const result = discoverModuleMigrations(dir);
    expect(result.map((m) => m.name)).toEqual([
      "Migration_Weird",
      "Migration20260101000000_Real",
    ]);
    expect(result[0]!.timestamp).toBe(0);
  });

  it("module-level and cross-module discovery agree on order for the same files", () => {
    const files = [
      "Migration20260101000000_Real.sql",
      "Migration_Weird.sql",
      "Migration20251201000000_Older.sql",
    ];
    const dir = makeModule(files);

    const moduleOrder = discoverModuleMigrations(dir).map((m) => m.name);
    const allOrder = discoverAllMigrations([dir]).map((m) => m.name);

    // Regression guard: the two discovery entry points must not diverge.
    expect(moduleOrder).toEqual(allOrder);
    expect(moduleOrder).toEqual([
      "Migration_Weird", // timestamp 0
      "Migration20251201000000_Older",
      "Migration20260101000000_Real",
    ]);
  });
});

describe("discoverAllMigrations — cross-module ordering", () => {
  it("interleaves migrations from different modules strictly by timestamp", () => {
    const modA = makeModule([
      "Migration20260101000000_A1.sql",
      "Migration20260501000000_A2.sql",
    ]);
    const modB = makeModule([
      "Migration20260301000000_B1.sql",
      "Migration20260701000000_B2.sql",
    ]);

    expect(discoverAllMigrations([modA, modB]).map((m) => m.name)).toEqual([
      "Migration20260101000000_A1",
      "Migration20260301000000_B1",
      "Migration20260501000000_A2",
      "Migration20260701000000_B2",
    ]);
  });

  it("is stable for identical timestamps across modules (input order wins)", () => {
    const modA = makeModule(["Migration20260101000000_FromA.sql"]);
    const modB = makeModule(["Migration20260101000000_FromB.sql"]);

    // Same timestamp in both modules => the order follows the module list order.
    expect(discoverAllMigrations([modA, modB]).map((m) => m.name)).toEqual([
      "Migration20260101000000_FromA",
      "Migration20260101000000_FromB",
    ]);
    expect(discoverAllMigrations([modB, modA]).map((m) => m.name)).toEqual([
      "Migration20260101000000_FromB",
      "Migration20260101000000_FromA",
    ]);
  });
});

describe("generateTimestamp — formatting corners", () => {
  it("produces a value that round-trips through the discovery regex as an integer", () => {
    const ts = generateTimestamp(new Date("2026-03-16T10:30:45.000Z"));
    const filename = `Migration${ts}_Initial.sql`;
    const match = filename.match(/Migration(\d+)/);
    expect(match?.[1]).toBe("20260316103045");
    expect(parseInt(match![1]!, 10)).toBe(20260316103045);
  });

  it("two timestamps one second apart are string-sortable in chronological order", () => {
    const a = generateTimestamp(new Date("2026-12-31T23:59:59.000Z"));
    const b = generateTimestamp(new Date("2027-01-01T00:00:00.000Z"));
    expect(a < b).toBe(true);
    expect(a).toBe("20261231235959");
    expect(b).toBe("20270101000000");
  });

  it("never carries a 'Z' or punctuation into the 14-digit output", () => {
    const ts = generateTimestamp(new Date("2026-06-16T08:15:30.500Z"));
    expect(ts).toMatch(/^\d{14}$/);
    expect(ts).not.toContain("Z");
    expect(ts).not.toContain("-");
    expect(ts).not.toContain(".");
  });
});

describe("getMigrationTemplateWithSQL — formatting corners", () => {
  const created = new Date("2026-03-16T10:30:00.000Z");
  const base = (
    over: Partial<GeneratedMigration> = {},
  ): GeneratedMigration => ({
    upStatements: [],
    description: "No changes",
    warnings: [],
    ...over,
  });

  it("renders multiple warnings each on their own commented line", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      base({
        upStatements: ["DROP TABLE a"],
        warnings: ["first", "second", "third"],
      }),
    );
    expect(out).toContain("-- WARNING: first");
    expect(out).toContain("-- WARNING: second");
    expect(out).toContain("-- WARNING: third");
    // One leading '-- WARNING:' per warning, no concatenation.
    expect((out.match(/-- WARNING:/g) ?? []).length).toBe(3);
  });

  it("only appends a semicolon to statements that lack one, per statement", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "User",
      "user",
      created,
      base({
        upStatements: ["SELECT 1", "SELECT 2;", "SELECT 3"],
      }),
    );
    expect(out).toContain("SELECT 1;");
    expect(out).toContain("SELECT 2;");
    expect(out).toContain("SELECT 3;");
    expect(out).not.toContain(";;");
  });

  it("uses the placeholder body when up statements are empty regardless of description", () => {
    const out = getMigrationTemplateWithSQL(
      "M",
      "Init",
      "user",
      created,
      base({ upStatements: [], description: "schema initialised" }),
    );
    expect(out).toContain("-- No changes detected");
    // Description still rendered in the header even with the placeholder body.
    expect(out).toContain("-- schema initialised");
  });
});
