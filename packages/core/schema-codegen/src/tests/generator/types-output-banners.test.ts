import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateTypes } from "../../index";

{
  describe("generateTypes", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "product",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "name", type: "text", nullable: false },
            { name: "price", type: "numeric", nullable: true },
          ],
        },
        {
          name: "order",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "product_id", type: "uuid", nullable: false },
            { name: "quantity", type: "integer", nullable: false, default: 1 },
          ],
        },
      ],
      enums: [{ name: "status", values: ["pending", "shipped", "delivered"] }],
      relationships: [
        {
          fromTable: "order",
          from: "product",
          to: "product",
          type: "belongsTo",
          linkedBy: ["product_id"],
        },
      ],
    };

    it("supports custom banner", () => {
      const content = generateTypes(schema, { banner: "// custom banner\n" });
      expect(content).toContain("// custom banner");
    });
  });
}

{
  describe("generateTypes", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "product",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "name", type: "text", nullable: false },
            { name: "price", type: "numeric", nullable: true },
          ],
        },
        {
          name: "order",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "product_id", type: "uuid", nullable: false },
            { name: "quantity", type: "integer", nullable: false, default: 1 },
          ],
        },
      ],
      enums: [{ name: "status", values: ["pending", "shipped", "delivered"] }],
      relationships: [
        {
          fromTable: "order",
          from: "product",
          to: "product",
          type: "belongsTo",
          linkedBy: ["product_id"],
        },
      ],
    };

    it("can disable banner", () => {
      const content = generateTypes(schema, { banner: false });
      expect(content.startsWith("export")).toBe(true);
    });
  });
}
