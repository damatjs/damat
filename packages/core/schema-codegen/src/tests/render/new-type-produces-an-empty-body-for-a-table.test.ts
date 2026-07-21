import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateNewType } from "../../render/newType";

{
  describe("generateNewType", () => {
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
}

{
  describe("generateNewType", () => {
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
  });
}

{
  describe("generateNewType", () => {
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
}

{
  describe("generateNewType", () => {
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
  });
}

{
  describe("generateNewType", () => {
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
  });
}
