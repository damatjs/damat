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

  it("generates correct index.ts exports", () => {
    const files = generateFilesMap(schema);
    const indexContent = files.get("index.ts")!;

    expect(indexContent).toContain('export * from "./enums";');
    expect(indexContent).toContain('export * from "./product";');
    expect(indexContent).toContain('export * from "./order-item";');
  });
});
