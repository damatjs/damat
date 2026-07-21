import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateFilesMap } from "../../index";

{
  describe("generateFilesMap", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "product",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
        {
          name: "order_item",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
      enums: [{ name: "status", values: ["active", "inactive"] }],
      relationships: [],
    };

    it("generates all expected files", () => {
      const files = generateFilesMap(schema);

      expect(files.has("enums.ts")).toBe(true);
      expect(files.has("product.ts")).toBe(true);
      expect(files.has("order-item.ts")).toBe(true);
      expect(files.has("index.ts")).toBe(true);
    });
  });
}

{
  describe("generateFilesMap", () => {
    it("does not generate enums.ts when no enums", () => {
      const noEnumSchema: ModuleSchema = {
        moduleName: "test",
        tables: [
          {
            name: "item",
            columns: [
              { name: "id", type: "uuid", nullable: false, primaryKey: true },
            ],
          },
        ],
      };
      const files = generateFilesMap(noEnumSchema);

      expect(files.has("enums.ts")).toBe(false);
      const indexContent = files.get("index.ts")!;
      expect(indexContent).not.toContain('export * from "./enums";');
    });
  });
}

{
  describe("generateFilesMap", () => {
    const schema: ModuleSchema = {
      moduleName: "store",
      tables: [
        {
          name: "product",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
        {
          name: "order_item",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
      enums: [{ name: "status", values: ["active", "inactive"] }],
      relationships: [],
    };

    it("emits a .zod.ts file per table alongside the type file", () => {
      const files = generateFilesMap(schema);
      expect(files.has("product.zod.ts")).toBe(true);
      expect(files.has("order-item.zod.ts")).toBe(true);

      const zod = files.get("product.zod.ts")!;
      expect(zod).toContain('import { z } from "@damatjs/deps/zod"');
      expect(zod).toContain("export const newProductSchema = z.object({");
      expect(zod).toContain(
        "export const ProductIdSchema = z.string().uuid();",
      );
    });
  });
}
