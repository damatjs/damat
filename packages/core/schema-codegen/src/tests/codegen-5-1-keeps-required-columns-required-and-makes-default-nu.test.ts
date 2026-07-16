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

  it("keeps required columns required and makes default/nullable optional", () => {
    const out = generateTypes(schema, { banner: false });
    const newBlock = out.match(/export type NewProduct = \{[\s\S]*?\};/)![0];
    expect(newBlock).toContain("  title: string;");
    expect(newBlock).toContain("  stock?: number;");
    expect(newBlock).toContain("  description?: string | null;");
  });
});
