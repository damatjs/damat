import { describe, it, expect } from "bun:test";
import { generateIdZodSchema } from "../render/zod";

describe("generateIdZodSchema", () => {
  it("uses a coerced positive int for integer / serial PK", () => {
    for (const t of ["integer", "serial"] as const) {
      const lines = generateIdZodSchema({
        name: "item",
        columns: [{ name: "id", type: t, nullable: false, primaryKey: true }],
      });
      expect(lines).toContain(
        "export const ItemIdSchema = z.coerce.number().int().positive();",
      );
    }
  });
});
