import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewZodSchema } from "../render/zod";

describe("generateNewZodSchema", () => {
  const allEnums = [{ name: "role", values: ["admin", "member"] }];

  it("falls back to z.string() for an enum with no matching enum schema", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "account",
      columns: [
        { name: "role", type: "enum", enum: "missing", nullable: false },
      ],
    };
    const lines = generateNewZodSchema(table, new Set(), allEnums);
    expect(lines).toContain("  role: z.string(),");
  });
});
