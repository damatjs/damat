import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateNewZodSchema } from "../render/zod";

describe("generateNewZodSchema", () => {
  const allEnums = [{ name: "role", values: ["admin", "member"] }];

  it("requires plain columns, makes defaults optional, nullables nullable+optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "user",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "email", type: "text", nullable: false },
        { name: "role", type: "text", nullable: false, default: "member" },
        { name: "bio", type: "text", nullable: true },
      ],
    };
    const lines = generateNewZodSchema(table, new Set(["id"]), allEnums);
    expect(lines).toContain("  email: z.string(),");
    expect(lines).toContain("  role: z.string().optional(),");
    expect(lines).toContain("  bio: z.string().nullable().optional(),");
    // auto field omitted
    expect(lines.some((l) => l.trimStart().startsWith("id:"))).toBe(false);
  });
});
