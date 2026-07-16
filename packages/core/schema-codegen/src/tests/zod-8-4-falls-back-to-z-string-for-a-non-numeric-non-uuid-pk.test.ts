import { describe, it, expect } from "bun:test";
import { generateIdZodSchema } from "../render/zod";

describe("generateIdZodSchema", () => {
  it("falls back to z.string() for a non-numeric, non-uuid PK", () => {
    const lines = generateIdZodSchema({
      name: "code",
      columns: [
        { name: "value", type: "text", nullable: false, primaryKey: true },
      ],
    });
    expect(lines).toContain("export const CodeIdSchema = z.string();");
  });
});
