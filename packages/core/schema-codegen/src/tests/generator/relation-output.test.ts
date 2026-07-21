import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateTypes } from "../../index";

{
  describe("generateTypes › relations and edge cases", () => {
    it("adds optional belongsTo / hasMany / hasOne relation fields", () => {
      const schema: ModuleSchema = {
        moduleName: "blog",
        tables: [
          {
            name: "user",
            columns: [
              { name: "id", type: "uuid", nullable: false, primaryKey: true },
            ],
          },
        ],
        relationships: [
          {
            fromTable: "user",
            from: "profile",
            to: "profile",
            type: "hasOne",
            linkedBy: [],
          },
          {
            fromTable: "user",
            from: "posts",
            to: "post",
            type: "hasMany",
            linkedBy: [],
          },
          {
            fromTable: "user",
            from: "org",
            to: "organization",
            type: "belongsTo",
            linkedBy: ["organization_id"],
          },
        ],
      };
      const out = generateTypes(schema, { banner: false });
      expect(out).toContain("  // loaded relations");
      expect(out).toContain("  profile?: Profile;");
      expect(out).toContain("  posts?: Post[];");
      expect(out).toContain("  organization?: Organization;");
    });
  });
}

{
  describe("generateTypes › relations and edge cases", () => {
    it("emits no enum block or relation comment for a bare module", () => {
      const schema: ModuleSchema = {
        moduleName: "bare",
        tables: [
          {
            name: "category",
            columns: [
              { name: "id", type: "uuid", nullable: false, primaryKey: true },
            ],
          },
        ],
      };
      const out = generateTypes(schema, { banner: false });
      expect(out).toContain("export interface Category {");
      // New*/Update* types are always emitted, but no enum alias should be.
      expect(out).not.toMatch(/export type \w+Enum =/);
      expect(out).not.toContain("// loaded relations");
      expect(out).not.toMatch(/=\s*'/); // no enum union literal anywhere
    });
  });
}

{
  describe("generateTypes › relations and edge cases", () => {
    it("PascalCases snake_case table names across all emitted artifacts", () => {
      const schema: ModuleSchema = {
        moduleName: "x",
        tables: [
          {
            name: "order_item",
            columns: [
              { name: "id", type: "uuid", nullable: false, primaryKey: true },
            ],
          },
        ],
      };
      const out = generateTypes(schema, { banner: false });
      expect(out).toContain("export interface OrderItem {");
      expect(out).toContain("export type NewOrderItem = {");
      expect(out).toContain(
        "export type UpdateOrderItem = Partial<Omit<OrderItem, 'id'>>;",
      );
    });
  });
}
