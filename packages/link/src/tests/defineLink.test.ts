import { describe, test, expect } from "bun:test";
import { model, columns } from "@damatjs/orm-model";
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
    expect(
      (fkLink.model.toTableSchema().foreignKeys ?? []).length,
    ).toBeGreaterThan(0);
  });

  test("honors a pivotTable override", () => {
    const custom = defineLink(
      { module: "user", model: "user" },
      { module: "organization", model: "organization" },
      { pivotTable: "membership" },
    );
    expect(custom.pivotTable).toBe("membership");
  });

  test("honors pivotColumns overrides", () => {
    const custom = defineLink(
      { module: "user", model: "user" },
      { module: "organization", model: "organization" },
      { pivotColumns: { left: "member_id", right: "org_id" } },
    );
    expect(custom.leftColumn).toBe("member_id");
    expect(custom.rightColumn).toBe("org_id");
    expect(columnNames(custom)).toEqual(
      expect.arrayContaining(["member_id", "org_id"]),
    );
  });
});

describe("defineLink — table-name derivation (key != singular table)", () => {
  // The reference-app shape: plural tables, so the models-map keys are plural
  // ("users"/"organizations") while the migrated junction is user_organization.
  const link = defineLink(
    { module: "user", model: "users", field: "users" },
    { module: "organization", model: "organizations", field: "organizations" },
  );

  test("plural model keys still derive the singular junction naming", () => {
    expect(link.pivotTable).toBe("user_organization");
    expect(link.leftColumn).toBe("user_id");
    expect(link.rightColumn).toBe("organization_id");
  });

  test("camelCase model keys derive snake_case singular column names", () => {
    const l = defineLink(
      { module: "catering", model: "functionSpaces" },
      { module: "location", model: "location" },
    );
    expect(l.leftColumn).toBe("function_space_id");
    expect(l.rightColumn).toBe("location_id");
    expect(l.pivotTable).toBe("catering_function_space_location");
  });
});

describe("defineLink — registry-resolved tables and primary keys", () => {
  // Register real models (table names are unique to avoid registry bleed).
  const Product = model("lk_products", {
    sku: columns.text().primaryKey(),
    name: columns.text(),
  });
  const Warehouse = model("lk_warehouses", {
    id: columns.id({ prefix: "wh" }).primaryKey(),
  });
  void Product;
  void Warehouse;

  const link = defineLink(
    { module: "catalog", model: "lkProducts" },
    { module: "wms", model: "lkWarehouses" },
    { database: { foreignKeys: true } },
  );

  test("resolves each side's real table for naming", () => {
    expect(link.left.table).toBe("lk_products");
    expect(link.right.table).toBe("lk_warehouses");
    expect(link.leftColumn).toBe("lk_product_id");
    expect(link.rightColumn).toBe("lk_warehouse_id");
  });

  test("FKs target the real table, honor the model's PK, and cascade", () => {
    const fks = link.model.toTableSchema().foreignKeys ?? [];
    const productFk = fks.find((f) => f.referencedTable === "lk_products");
    expect(productFk?.referencedColumns).toEqual(["sku"]);
    expect(productFk?.onDelete).toBe("CASCADE");
    const warehouseFk = fks.find((f) => f.referencedTable === "lk_warehouses");
    expect(warehouseFk?.referencedColumns).toEqual(["id"]);
    expect(warehouseFk?.onDelete).toBe("CASCADE");
  });

  test("the endpoint's primaryKey defaults to the model's actual PK", () => {
    expect(link.left.primaryKey).toBe("sku");
    expect(link.right.primaryKey).toBe("id");
  });

  test("an explicit endpoint primaryKey wins over the registry", () => {
    const l = defineLink(
      { module: "catalog", model: "lkProducts", primaryKey: "name" },
      { module: "wms", model: "lkWarehouses" },
      { pivotTable: "lk_pk_override", database: { foreignKeys: true } },
    );
    const fk = (l.model.toTableSchema().foreignKeys ?? []).find(
      (f) => f.referencedTable === "lk_products",
    );
    expect(fk?.referencedColumns).toEqual(["name"]);
  });
});

const ep = (module: string, table: string) => ({ module, table });

describe("naming", () => {
  test("collapses module/table segments when equal", () => {
    expect(
      defaultPivotTable(ep("user", "user"), ep("billing", "invoice")),
    ).toBe("user_billing_invoice");
  });

  test("collapses a plural table onto its module's logical name", () => {
    expect(
      defaultPivotTable(
        ep("user", "users"),
        ep("organization", "organizations"),
      ),
    ).toBe("user_organization");
  });

  test("disambiguates identical column names across modules", () => {
    const { leftColumn, rightColumn } = pivotColumns(
      ep("a", "note"),
      ep("b", "note"),
    );
    expect(leftColumn).toBe("a_note_id");
    expect(rightColumn).toBe("b_note_id");
  });
});

describe("collectLinkModels", () => {
  test("keys junction models by their camelCase model name", () => {
    const a = defineLink(
      { module: "user", model: "user" },
      { module: "org", model: "org" },
    );
    const b = defineLink(
      { module: "user", model: "user" },
      { module: "team", model: "team" },
    );
    const models = collectLinkModels([a, b]);
    expect(Object.keys(models).sort()).toEqual(["userOrg", "userTeam"]);
  });

  test("throws on duplicate junctions", () => {
    const a = defineLink(
      { module: "user", model: "user" },
      { module: "org", model: "org" },
    );
    const b = defineLink(
      { module: "user", model: "user" },
      { module: "org", model: "org" },
    );
    expect(() => collectLinkModels([a, b])).toThrow(/Duplicate link junction/);
  });
});
