import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("falls back to rel.from for belongsTo when linkedBy is undefined", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
      },
    ]);
    expect(fields).toEqual(["  author?: Users;"]);
  });
});
