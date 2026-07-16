import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewZodSchema } from "../render/zod";

describe("generateNewZodSchema", () => {
  it("skips created_at / updated_at / deleted_at columns by name", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "row",
      columns: [
        { name: "value", type: "text", nullable: false },
        { name: "created_at", type: "date", nullable: false },
        { name: "updated_at", type: "date", nullable: true },
        { name: "deleted_at", type: "date", nullable: true },
      ],
    };
    const lines = generateNewZodSchema(table, new Set(), []);
    const body = lines.join("\n");
    expect(body).toContain("value: z.string(),");
    expect(body).not.toContain("created_at");
    expect(body).not.toContain("updated_at");
    expect(body).not.toContain("deleted_at");
  });
});
