import { describe, it, expect } from "bun:test";
import { generateIdZodSchema } from "../../render/zod";

{
  describe("generateIdZodSchema", () => {
    it("uses z.string().uuid() for a uuid PK", () => {
      const lines = generateIdZodSchema({
        name: "user",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
        ],
      });
      expect(lines).toContain("export const UserIdSchema = z.string().uuid();");
      expect(lines).toContain(
        "export type UserId = z.infer<typeof UserIdSchema>;",
      );
    });
  });
}

{
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
}

{
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
}

{
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
}

{
  describe("generateIdZodSchema", () => {
    it("returns an empty array when the table has no primary key", () => {
      const lines = generateIdZodSchema({
        name: "np",
        columns: [{ name: "k", type: "text", nullable: false }],
      });
      expect(lines).toEqual([]);
    });
  });
}
