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

  it("generates all expected files", () => {
    const files = generateFilesMap(schema);

    expect(files.has("enums.ts")).toBe(true);
    expect(files.has("product.ts")).toBe(true);
    expect(files.has("order-item.ts")).toBe(true);
    expect(files.has("index.ts")).toBe(true);
  });
});
