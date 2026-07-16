import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("handles multiple relations of every kind in order", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
      {
        fromTable: "posts",
        from: "comments",
        to: "comments",
        type: "hasMany",
        linkedBy: [],
      },
      {
        fromTable: "posts",
        from: "metadata",
        to: "metadata",
        type: "hasOne",
        linkedBy: [],
      },
    ]);

    expect(fields).toEqual([
      "  user?: Users;",
      "  comments?: Comments[];",
      "  metadata?: Metadata;",
    ]);
  });
});
