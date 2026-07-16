import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("generates hasMany field as an array using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "posts",
        to: "posts",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    // hasMany → array; name = rel.from; type = toPascalCase(rel.to).
    expect(fields).toEqual(["  posts?: Posts[];"]);
  });
});
