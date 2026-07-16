import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewZodSchema } from "../render/zod";

describe("generateNewZodSchema", () => {
  const allEnums = [{ name: "role", values: ["admin", "member"] }];

  it("expands a named enum into z.enum([...]) with its literal values", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "account",
      columns: [{ name: "role", type: "enum", enum: "role", nullable: false }],
    };
    const lines = generateNewZodSchema(table, new Set(), allEnums);
    expect(lines).toContain("  role: z.enum(['admin', 'member']),");
  });
});
