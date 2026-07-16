import { describe, it, expect } from "bun:test";
import { generateIdZodSchema } from "../render/zod";

describe("generateIdZodSchema", () => {
  it("uses a coerced bigint for bigint / bigserial PK", () => {
    const lines = generateIdZodSchema({
      name: "big",
      columns: [
        { name: "id", type: "bigserial", nullable: false, primaryKey: true },
      ],
    });
    expect(lines).toContain("export const BigIdSchema = z.coerce.bigint();");
  });
});
