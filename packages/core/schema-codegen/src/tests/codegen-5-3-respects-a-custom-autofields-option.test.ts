import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

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

  it("respects a custom autoFields option", () => {
    const out = generateTypes(schema, { banner: false, autoFields: ["stock"] });
    const newBlock = out.match(/export type NewProduct = \{[\s\S]*?\};/)![0];
    expect(newBlock).not.toContain("stock");
    expect(newBlock).toContain("title: string;");
  });
});
