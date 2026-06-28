import { describe, test, expect } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { defineLink } from "../defineLink";
import { defaultPivotTable, pivotColumns } from "../naming";
import { buildPivotModel } from "../pivot";
import { LinkRegistry } from "../registry";
import {
  resolveLinkModuleEntries,
  resolveLinkMigrationModules,
} from "../config";
import type { ResolvedEndpoint } from "../types";

const ep = (
  module: string,
  model: string,
  extra: Partial<ResolvedEndpoint> = {},
): ResolvedEndpoint => ({
  module,
  model,
  primaryKey: "id",
  alias: model,
  isList: true,
  ...extra,
});

describe("naming — defaultPivotTable", () => {
  test("keeps module_model when they differ on a side", () => {
    expect(defaultPivotTable(ep("billing", "invoice"), ep("user", "user"))).toBe(
      "billing_invoice_user",
    );
  });

  test("is order-sensitive (table name follows left,right argument order)", () => {
    const lr = defaultPivotTable(ep("user", "user"), ep("org", "org"));
    const rl = defaultPivotTable(ep("org", "org"), ep("user", "user"));
    expect(lr).toBe("user_org");
    expect(rl).toBe("org_user");
    expect(lr).not.toBe(rl);
  });

  test("is deterministic for the same inputs", () => {
    const a = defaultPivotTable(ep("a", "a"), ep("b", "b"));
    const b = defaultPivotTable(ep("a", "a"), ep("b", "b"));
    expect(a).toBe(b);
  });

  test("clamps an over-long name to 63 bytes with a stable hash suffix", () => {
    const long = ep("x".repeat(40), "y".repeat(40));
    const other = ep("z", "z");
    const name = defaultPivotTable(long, other);
    expect(name.length).toBeLessThanOrEqual(63);
    // determinism of the clamp
    expect(defaultPivotTable(long, other)).toBe(name);
  });
});

describe("naming — pivotColumns", () => {
  test("defaults to <model>_id on each side", () => {
    const { leftColumn, rightColumn } = pivotColumns(ep("u", "user"), ep("o", "org"));
    expect(leftColumn).toBe("user_id");
    expect(rightColumn).toBe("org_id");
  });

  test("qualifies with module id only when both columns would collide", () => {
    const { leftColumn, rightColumn } = pivotColumns(ep("a", "note"), ep("b", "note"));
    expect(leftColumn).toBe("a_note_id");
    expect(rightColumn).toBe("b_note_id");
  });
});

describe("pivot — buildPivotModel", () => {
  const base = {
    table: "user_org",
    leftColumn: "user_id",
    rightColumn: "org_id",
    idPrefix: "link",
    options: {},
  };

  test("creates id + both FK columns + soft-delete timestamps", () => {
    const cols = buildPivotModel(base).toTableSchema().columns.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("user_id");
    expect(cols).toContain("org_id");
    expect(cols).toContain("deleted_at");
  });

  test("emits a unique pair index plus a per-column index, named off the table", () => {
    const idx = buildPivotModel(base).toTableSchema().indexes ?? [];
    const names = idx.map((i) => i.name);
    expect(names).toContain("user_org_pair_uniq");
    expect(names).toContain("user_org_user_id_idx");
    expect(names).toContain("user_org_org_id_idx");
    const unique = idx.find((i) => i.unique);
    expect(unique?.columns.map((c) => c.name).sort()).toEqual(["org_id", "user_id"]);
  });

  test("merges database.extraColumns into the junction model", () => {
    const { columns } = require("@damatjs/orm-model");
    const cols = buildPivotModel({
      ...base,
      options: { database: { extraColumns: { role: columns.text() } } },
    })
      .toTableSchema()
      .columns.map((c) => c.name);
    expect(cols).toContain("role");
  });

  test("foreignKeys option produces FK constraints; default emits none", () => {
    expect(buildPivotModel(base).toTableSchema().foreignKeys ?? []).toHaveLength(0);
    const withFk = buildPivotModel({
      ...base,
      foreignKeys: { leftTarget: "users", rightTarget: "orgs" },
    });
    expect((withFk.toTableSchema().foreignKeys ?? []).length).toBeGreaterThan(0);
  });
});

describe("registry — resolve with module disambiguation", () => {
  // Two links that share the model name "item" but in different modules.
  const a = defineLink({ module: "store", model: "item" }, { module: "tax", model: "rate" });
  const b = defineLink({ module: "wms", model: "item" }, { module: "loc", model: "bin" });
  const registry = new LinkRegistry([a, b]);

  test("module qualifier selects the right link when model names collide", () => {
    const r1 = registry.resolve({ module: "store", model: "item" }, { model: "rate" });
    expect(r1.other.model).toBe("rate");
    const r2 = registry.resolve({ module: "wms", model: "item" }, { model: "bin" });
    expect(r2.other.model).toBe("bin");
  });

  test("without a module qualifier the first matching link wins", () => {
    // "item" -> "rate" only exists on link a; resolve by model alone.
    const r = registry.resolve({ model: "item" }, { model: "rate" });
    expect(r.link).toBe(a);
  });

  test("orientation flips fromColumn/toColumn", () => {
    const fwd = registry.resolve({ model: "item", module: "store" }, { model: "rate" });
    const rev = registry.resolve({ model: "rate" }, { model: "item", module: "store" });
    expect(fwd.fromColumn).toBe(rev.toColumn);
    expect(fwd.toColumn).toBe(rev.fromColumn);
  });

  test("resolve throws for an undefined pair", () => {
    expect(() => registry.resolve({ model: "item" }, { model: "ghost" })).toThrow(
      /No link defined/,
    );
  });
});

describe("registry — linksFrom", () => {
  const link = defineLink(
    { module: "u", model: "user", field: "users" },
    { module: "o", model: "org", field: "orgs" },
  );
  const registry = new LinkRegistry([link]);

  test("returns the outgoing orientation with the other side's alias", () => {
    const out = registry.linksFrom("u", "user");
    expect(out).toHaveLength(1);
    expect(out[0]!.other.alias).toBe("orgs");
    expect(out[0]!.fromColumn).toBe("user_id");
  });

  test("returns nothing for a module/model not on either side", () => {
    expect(registry.linksFrom("u", "ghost")).toEqual([]);
    // right model on the wrong module id must not match
    expect(registry.linksFrom("WRONG", "org")).toEqual([]);
  });

  test("both endpoints of a link are discoverable from their own side", () => {
    const l = defineLink(
      { module: "g", model: "node", field: "outgoing" },
      { module: "g", model: "edge", field: "incoming" },
    );
    const reg = new LinkRegistry([l]);
    expect(reg.linksFrom("g", "node")).toHaveLength(1);
    expect(reg.linksFrom("g", "edge")).toHaveLength(1);
  });
});

describe("config — resolveLinkModuleEntries", () => {
  function tmproot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "link-cfg-"));
  }

  test("returns [] when links is undefined", () => {
    expect(resolveLinkModuleEntries(undefined, process.cwd())).toEqual([]);
  });

  test("a single existing path with an index registers id 'link'", () => {
    const root = tmproot();
    const dir = path.join(root, "links");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.ts"), "export const models = {};");
    const entries = resolveLinkModuleEntries("./links", root);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("link");
    expect(entries[0]!.resolve).toBe(dir);
    expect(entries[0]!.path).toBe("./links");
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("a path without an entry index is skipped", () => {
    const root = tmproot();
    fs.mkdirSync(path.join(root, "links"), { recursive: true }); // no index
    expect(resolveLinkModuleEntries("./links", root)).toEqual([]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("multiple paths register id 'link:<basename>' per path", () => {
    const root = tmproot();
    for (const name of ["alpha", "beta"]) {
      const d = path.join(root, name);
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, "index.js"), "module.exports = {};");
    }
    const entries = resolveLinkModuleEntries(["./alpha", "./beta"], root);
    expect(entries.map((e) => e.id).sort()).toEqual(["link:alpha", "link:beta"]);
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("absolute paths are used as-is", () => {
    const root = tmproot();
    const dir = path.join(root, "abslinks");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.ts"), "export const models = {};");
    const entries = resolveLinkModuleEntries(dir, process.cwd());
    expect(entries).toHaveLength(1);
    expect(entries[0]!.resolve).toBe(dir);
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("config — resolveLinkMigrationModules edge cases", () => {
  test("ignores files (non-directories) under the links root", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "link-mig-"));
    fs.mkdirSync(path.join(root, "links"), { recursive: true });
    fs.writeFileSync(path.join(root, "links", "stray.ts"), "// not a dir");
    const owner = path.join(root, "links", "user");
    fs.mkdirSync(owner, { recursive: true });
    fs.writeFileSync(path.join(owner, "index.ts"), "export const models = {};");

    const entries = resolveLinkMigrationModules("./links", root);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("link:user");
    fs.rmSync(root, { recursive: true, force: true });
  });

  test("returns [] when the links root does not exist", () => {
    expect(
      resolveLinkMigrationModules("./does-not-exist", os.tmpdir()),
    ).toEqual([]);
  });
});
