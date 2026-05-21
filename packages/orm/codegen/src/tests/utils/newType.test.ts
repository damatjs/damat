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
      columns: [
        { name: "description", type: "text", nullable: true },
      ],
    };

    const lines = generateNewType(table, new Set());
    expect(lines.some((l) => l.includes("description?:"))).toBe(true);
  });

  it("keeps required columns non-optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "name", type: "text", nullable: false },
      ],
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
    expect(lines.some((l) => l.includes("export type NewOrderItem"))).toBe(true);
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
});
