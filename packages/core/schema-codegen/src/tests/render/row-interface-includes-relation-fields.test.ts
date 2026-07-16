import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateRowInterface } from "../../render/rowInterface";

{
  describe("generateRowInterface", () => {
    it("includes relation fields", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "product",
        columns: [{ name: "id", type: "uuid", nullable: false }],
      };

      const relations = [
        {
          fromTable: "product",
          from: "category",
          to: "category",
          type: "belongsTo" as const,
          linkedBy: ["category_id"],
        },
      ];

      const lines = generateRowInterface(table, relations);
      expect(lines).toContain("  // loaded relations");
      expect(lines).toContain("  category?: Category;");
    });
  });
}

{
  describe("generateRowInterface", () => {
    it("includes multiple relations", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "post",
        columns: [{ name: "id", type: "uuid", nullable: false }],
      };

      const relations = [
        {
          fromTable: "post",
          from: "author",
          to: "user",
          type: "belongsTo" as const,
          linkedBy: ["user_id"],
        },
        {
          fromTable: "post",
          from: "comments",
          to: "comment",
          type: "hasMany" as const,
          linkedBy: [],
        },
      ];

      const lines = generateRowInterface(table, relations);
      expect(lines).toContain("  user?: User;");
      expect(lines).toContain("  comments?: Comment[];");
    });
  });
}

{
  describe("generateRowInterface", () => {
    it("emits every column type (nullable, array, enum) verbatim", () => {
      const table: ModuleSchema["tables"][number] = {
        name: "widget",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "title", type: "text", nullable: true },
          { name: "labels", type: "text", nullable: false, array: true },
          { name: "scores", type: "integer", nullable: true, array: true },
          { name: "kind", type: "enum", enum: "widget_kind", nullable: false },
          {
            name: "created_at",
            type: "timestamp with time zone",
            nullable: false,
          },
        ],
      };
      const lines = generateRowInterface(table, []);
      expect(lines).toContain("  id: string;");
      expect(lines).toContain("  title: string | null;");
      expect(lines).toContain("  labels: Array<string>;");
      expect(lines).toContain("  scores: Array<number> | null;");
      expect(lines).toContain("  kind: WidgetKindEnum;");
      // row interface keeps timestamp columns (unlike New*)
      expect(lines).toContain("  created_at: Date;");
    });
  });
}
