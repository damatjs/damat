import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("gives multiple relations to the same target distinct FK-derived names", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["author_id"],
      },
      {
        fromTable: "posts",
        from: "reviewer",
        to: "users",
        type: "belongsTo",
        linkedBy: ["reviewer_id"],
      },
    ]);

    // Same target type twice — names disambiguated by the FK column.
    expect(fields).toEqual(["  author?: Users;", "  reviewer?: Users;"]);
  });
});
