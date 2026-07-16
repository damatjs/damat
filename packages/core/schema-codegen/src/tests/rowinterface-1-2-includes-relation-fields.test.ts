import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("includes relation fields", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };

    const relations = [
      {
        fromTable: "product",
        from: "category",
        to: "category",
        type: "belongsTo" as const,
        linkedBy: ["category_id"],
      },
    ];

    const lines = generateRowInterface(table, relations);
    expect(lines).toContain("  // loaded relations");
    expect(lines).toContain("  category?: Category;");
  });
});
