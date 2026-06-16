import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ModuleSchema } from "@damatjs/orm-type";
import {
  loadSnapshot,
  saveSnapshot,
  snapshotExist,
} from "../../snapshot";
import { idColumn, moduleSchema, table } from "../__fixtures__/schemas";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "processor-snap-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("snapshotExist", () => {
  it("returns false when no snapshot file is present", () => {
    expect(snapshotExist(dir)).toBe(false);
  });

  it("returns true after a snapshot is saved", () => {
    saveSnapshot(dir, moduleSchema());
    expect(snapshotExist(dir)).toBe(true);
  });
});

describe("loadSnapshot", () => {
  it("returns an empty baseline schema when no file exists", () => {
    const snap = loadSnapshot(dir, "billing");
    expect(snap.moduleName).toBe("billing");
    expect(snap.schema).toBe("public");
    expect(snap.tables).toEqual([]);
    expect(snap.enums).toEqual([]);
    expect(snap.relationships).toEqual([]);
  });

  it("writes the snapshot file at schema-snapshot.json", () => {
    saveSnapshot(dir, moduleSchema());
    expect(fs.existsSync(path.join(dir, "schema-snapshot.json"))).toBe(true);
  });

  it("round-trips a non-trivial schema unchanged", () => {
    const original: ModuleSchema = moduleSchema({
      moduleName: "shop",
      schema: "store",
      enums: [{ name: "status", values: ["a", "b"] }],
      tables: [
        table("user", [idColumn], {
          indexes: [{ name: "user_id_idx", columns: ["id"] }],
        }),
      ],
    });
    saveSnapshot(dir, original);
    const loaded = loadSnapshot(dir, "shop");
    expect(loaded).toEqual(original);
  });

  it("persists pretty-printed JSON (2-space indent)", () => {
    saveSnapshot(dir, moduleSchema({ tables: [table("t", [idColumn])] }));
    const raw = fs.readFileSync(path.join(dir, "schema-snapshot.json"), "utf-8");
    expect(raw).toContain('\n  "moduleName"');
  });
});

describe("saveSnapshot", () => {
  it("creates the migrations directory if it does not yet exist", () => {
    const nested = path.join(dir, "a", "b", "migrations");
    expect(fs.existsSync(nested)).toBe(false);
    saveSnapshot(nested, moduleSchema());
    expect(fs.existsSync(path.join(nested, "schema-snapshot.json"))).toBe(true);
  });

  it("overwrites a previously saved snapshot", () => {
    saveSnapshot(dir, moduleSchema({ moduleName: "v1" }));
    saveSnapshot(dir, moduleSchema({ moduleName: "v2" }));
    expect(loadSnapshot(dir, "fallback").moduleName).toBe("v2");
  });
});
