import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateFilesMap } from "../index";

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
    expect(zod).toContain("export const ProductIdSchema = z.string().uuid();");
  });
});
