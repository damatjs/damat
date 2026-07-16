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

  it("exports both the type and zod modules per table from index.ts", () => {
    const files = generateFilesMap(schema);
    const index = files.get("index.ts")!;
    expect(index).toContain('export * from "./product";');
    expect(index).toContain('export * from "./product.zod";');
    expect(index).toContain('export * from "./order-item";');
    expect(index).toContain('export * from "./order-item.zod";');
  });
});
