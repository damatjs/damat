import { describe, test, expect } from "bun:test";
import { defineLink } from "../defineLink";
import { collectLinkModels } from "../registry";
import { defaultPivotTable, pivotColumns } from "../naming";

function columnNames(def: ReturnType<typeof defineLink>): string[] {
  return def.model.toTableSchema().columns.map((c) => c.name);
}

describe("defineLink", () => {
  const link = defineLink(
    { module: "user", model: "user", field: "users" },
    { module: "organization", model: "organization", field: "organizations" },
  );

  test("derives a collapsed junction table name and camelCase model key", () => {
    expect(link.pivotTable).toBe("user_organization");
    expect(link.pivotName).toBe("userOrganization");
    expect(link.leftColumn).toBe("user_id");
    expect(link.rightColumn).toBe("organization_id");
  });

  test("builds a junction model with id + both FK columns + timestamps/soft-delete", () => {
    const names = columnNames(link);
    expect(names).toContain("id");
    expect(names).toContain("user_id");
    expect(names).toContain("organization_id");
    expect(names).toContain("created_at");
    expect(names).toContain("updated_at");
    expect(names).toContain("deleted_at");
  });

  test("the id column generates ids with the link prefix", () => {
    const id = link.model.toTableSchema().columns.find((c) => c.name === "id");
    expect(String(id?.default)).toContain("generate_id");
    expect(String(id?.default)).toContain("link");
  });

  test("adds a unique index over the FK pair plus a per-column index", () => {
    const indexes = link.model.toTableSchema().indexes ?? [];
    const unique = indexes.find((i) => i.unique);
    expect(unique?.columns.map((c) => c.name).sort()).toEqual([
      "organization_id",
      "user_id",
    ]);
    expect(indexes.length).toBeGreaterThanOrEqual(3);
  });

  test("emits no cross-module foreign keys by default", () => {
    expect(link.model.toTableSchema().foreignKeys ?? []).toHaveLength(0);
  });

  test("opt-in foreign keys produce FK constraints", () => {
    const fkLink = defineLink(
      { module: "user", model: "user" },
      { module: "organization", model: "organization" },
      { database: { foreignKeys: true } },
    );
    expect((fkLink.model.toTableSchema().foreignKeys ?? []).length).toBeGreaterThan(0);
  });

  test("honors a pivotTable override", () => {
    const custom = defineLink(
      { module: "user", model: "user" },
      { module: "organization", model: "organization" },
      { pivotTable: "membership" },
    );
    expect(custom.pivotTable).toBe("membership");
  });
});

describe("naming", () => {
  test("collapses module/model segments when equal", () => {
    const left = { module: "user", model: "user", primaryKey: "id", alias: "user", isList: true };
    const right = { module: "billing", model: "invoice", primaryKey: "id", alias: "invoice", isList: true };
    expect(defaultPivotTable(left, right)).toBe("user_billing_invoice");
  });

  test("disambiguates identical column names across modules", () => {
    const a = { module: "a", model: "note", primaryKey: "id", alias: "note", isList: true };
    const b = { module: "b", model: "note", primaryKey: "id", alias: "note", isList: true };
    const { leftColumn, rightColumn } = pivotColumns(a, b);
    expect(leftColumn).toBe("a_note_id");
    expect(rightColumn).toBe("b_note_id");
  });
});

describe("collectLinkModels", () => {
  test("keys junction models by their camelCase model name", () => {
    const a = defineLink({ module: "user", model: "user" }, { module: "org", model: "org" });
    const b = defineLink({ module: "user", model: "user" }, { module: "team", model: "team" });
    const models = collectLinkModels([a, b]);
    expect(Object.keys(models).sort()).toEqual(["userOrg", "userTeam"]);
  });

  test("throws on duplicate junctions", () => {
    const a = defineLink({ module: "user", model: "user" }, { module: "org", model: "org" });
    const b = defineLink({ module: "user", model: "user" }, { module: "org", model: "org" });
    expect(() => collectLinkModels([a, b])).toThrow(/Duplicate link junction/);
  });
});
