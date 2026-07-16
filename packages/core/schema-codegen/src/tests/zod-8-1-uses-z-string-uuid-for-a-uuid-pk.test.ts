import { describe, it, expect } from "bun:test";
import { generateIdZodSchema } from "../render/zod";

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
