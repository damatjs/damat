import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "name", type: "text", nullable: false },
          { name: "price", type: "numeric", nullable: true },
        ],
      },
      {
        name: "order",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "product_id", type: "uuid", nullable: false },
          { name: "quantity", type: "integer", nullable: false, default: 1 },
        ],
      },
    ],
    enums: [{ name: "status", values: ["pending", "shipped", "delivered"] }],
    relationships: [
      {
        fromTable: "order",
        from: "product",
        to: "product",
        type: "belongsTo",
        linkedBy: ["product_id"],
      },
    ],
  };

  it("includes banner by default", () => {
    const content = generateTypes(schema);
    expect(content).toContain("// This file is auto-generated");
  });
});
