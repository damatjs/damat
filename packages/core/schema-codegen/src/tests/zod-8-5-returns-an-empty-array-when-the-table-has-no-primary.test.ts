import { describe, it, expect } from "bun:test";
import { generateIdZodSchema } from "../render/zod";

describe("generateIdZodSchema", () => {
  it("returns an empty array when the table has no primary key", () => {
    const lines = generateIdZodSchema({
      name: "np",
      columns: [{ name: "k", type: "text", nullable: false }],
    });
    expect(lines).toEqual([]);
  });
});
