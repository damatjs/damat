import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateRowInterface } from "../render/rowInterface";

describe("generateRowInterface", () => {
  it("includes multiple relations", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "post",
      columns: [{ name: "id", type: "uuid", nullable: false }],
    };

    const relations = [
      {
        fromTable: "post",
        from: "author",
        to: "user",
        type: "belongsTo" as const,
        linkedBy: ["user_id"],
      },
      {
        fromTable: "post",
        from: "comments",
        to: "comment",
        type: "hasMany" as const,
        linkedBy: [],
      },
    ];

    const lines = generateRowInterface(table, relations);
    expect(lines).toContain("  user?: User;");
    expect(lines).toContain("  comments?: Comment[];");
  });
});
