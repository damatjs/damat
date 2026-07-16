import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateTypes } from "../../index";

{
  describe("generateTypes › New and Update types", () => {
    const schema: ModuleSchema = {
      moduleName: "shop",
      tables: [
        {
          name: "product",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "title", type: "text", nullable: false },
            { name: "stock", type: "integer", nullable: false, default: 0 },
            { name: "description", type: "text", nullable: true },
            { name: "created_at", type: "date", nullable: false },
            { name: "updated_at", type: "date", nullable: true },
          ],
        },
      ],
      relationships: [],
    };

    it("emits Update* as Partial<Omit<T, pk>>", () => {
      const out = generateTypes(schema, { banner: false });
      expect(out).toContain(
        "export type UpdateProduct = Partial<Omit<Product, 'id'>>;",
      );
    });
  });
}

{
  describe("generateTypes › New and Update types", () => {
    it("falls back to Partial<T> when there is no primary key", () => {
      const noPk: ModuleSchema = {
        moduleName: "x",
        tables: [
          {
            name: "log",
            columns: [
              { name: "message", type: "text", nullable: false },
              { name: "level", type: "text", nullable: false },
            ],
          },
        ],
      };
      const out = generateTypes(noPk, { banner: false });
      expect(out).toContain("export type UpdateLog = Partial<Log>;");
    });
  });
}
