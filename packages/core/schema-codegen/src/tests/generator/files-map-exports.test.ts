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

    it("generates correct index.ts exports", () => {
      const files = generateFilesMap(schema);
      const indexContent = files.get("index.ts")!;

      expect(indexContent).toContain('export * from "./enums";');
      expect(indexContent).toContain('export * from "./product";');
      expect(indexContent).toContain('export * from "./order-item";');
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

    it("exports both the type and zod modules per table from index.ts", () => {
      const files = generateFilesMap(schema);
      const index = files.get("index.ts")!;
      expect(index).toContain('export * from "./product";');
      expect(index).toContain('export * from "./product.zod";');
      expect(index).toContain('export * from "./order-item";');
      expect(index).toContain('export * from "./order-item.zod";');
    });
  });
}
