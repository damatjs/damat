import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("falls back to rel.from for belongsTo when linkedBy is empty", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: [],
      },
    ]);
    // No FK column → use the property name `author`; type from `users`.
    expect(fields).toEqual(["  author?: Users;"]);
  });
});
