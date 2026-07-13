import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewType } from "../../utils/newType";
import { DEFAULT_AUTO_FIELDS } from "../../defaults";

describe("generateNewType", () => {
  it("omits auto fields", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    };

    const lines = generateNewType(table, DEFAULT_AUTO_FIELDS);
    expect(lines.some((l) => l.includes("id:"))).toBe(false);
    expect(lines.some((l) => l.includes("name:"))).toBe(true);
  });

  it("makes columns with defaults optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "status", type: "text", nullable: false, default: "draft" },
      ],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("status?:"))).toBe(true);
  });

  it("makes nullable columns optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [{ name: "description", type: "text", nullable: true }],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("description?:"))).toBe(true);
  });

  it("keeps required columns non-optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [{ name: "name", type: "text", nullable: false }],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("name: string"))).toBe(true);
  });

  it("generates correct type name", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "order_item",
      columns: [],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("export type NewOrderItem"))).toBe(
      true,
    );
  });

  it("handles custom autoFields", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "audit",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "version", type: "integer", nullable: false },
        { name: "data", type: "jsonb", nullable: false },
      ],
    };

    const customAutoFields = new Set(["id", "version"]);
    const lines = generateNewType(table, customAutoFields);

    expect(lines.some((l) => l.includes("id:"))).toBe(false);
    expect(lines.some((l) => l.includes("version:"))).toBe(false);
    expect(lines.some((l) => l.includes("data:"))).toBe(true);
  });

  it("skips created_at / updated_at / deleted_at columns by name", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "record",
      columns: [
        { name: "value", type: "text", nullable: false },
        { name: "created_at", type: "date", nullable: false },
        { name: "updated_at", type: "date", nullable: true },
        { name: "deleted_at", type: "date", nullable: true },
      ],
    };
    const body = generateNewType(table, new Set()).join("\n");
    expect(body).toContain("value: string;");
    expect(body).not.toContain("created_at");
    expect(body).not.toContain("updated_at");
    expect(body).not.toContain("deleted_at");
  });

  it("emits the correct TS type for nullable, array and enum columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "widget",
      columns: [
        { name: "name", type: "text", nullable: false },
        { name: "labels", type: "text", nullable: false, array: true },
        { name: "note", type: "text", nullable: true },
        { name: "kind", type: "enum", enum: "widget_kind", nullable: false },
      ],
    };
    const lines = generateNewType(table, new Set());
    expect(lines).toContain("  name: string;");
    expect(lines).toContain("  labels: Array<string>;");
    expect(lines).toContain("  note?: string | null;");
    expect(lines).toContain("  kind: WidgetKindEnum;");
  });

  it("opens and closes the type block", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "thing",
      columns: [{ name: "x", type: "text", nullable: false }],
    };
    const lines = generateNewType(table, new Set());
    expect(lines[0]).toBe("export type NewThing = {");
    expect(lines[lines.length - 1]).toBe("};");
  });

  it("produces an empty body for a table whose columns are all auto/skipped", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "stamp",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "created_at", type: "date", nullable: false },
      ],
    };
    const lines = generateNewType(table, new Set(["id"]));
    expect(lines).toEqual(["export type NewStamp = {", "};"]);
  });
});
