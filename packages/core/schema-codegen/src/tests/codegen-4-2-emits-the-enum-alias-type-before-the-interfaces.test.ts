import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes › row interface column mapping", () => {
  const schema: ModuleSchema = {
    moduleName: "catalog",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "price", type: "numeric", nullable: false },
          { name: "in_stock", type: "boolean", nullable: false },
          {
            name: "released_at",
            type: "timestamp with time zone",
            nullable: false,
          },
          { name: "description", type: "text", nullable: true },
          { name: "tags", type: "text", nullable: true, array: true },
          { name: "specs", type: "jsonb", nullable: true },
          {
            name: "status",
            type: "enum",
            enum: "product_status",
            nullable: false,
          },
        ],
      },
    ],
    enums: [
      { name: "product_status", values: ["draft", "active", "archived"] },
    ],
    relationships: [],
  };

  it("emits the enum alias type before the interfaces", () => {
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain(
      "export type ProductStatusEnum = 'draft' | 'active' | 'archived';",
    );
    expect(out.indexOf("ProductStatusEnum =")).toBeLessThan(
      out.indexOf("export interface Product"),
    );
  });
});
