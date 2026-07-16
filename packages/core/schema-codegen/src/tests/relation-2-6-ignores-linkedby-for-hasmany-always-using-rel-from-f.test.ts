import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("ignores linkedBy for hasMany, always using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "orders",
        to: "orders",
        type: "hasMany",
        linkedBy: ["user_id"],
      },
    ]);
    expect(fields).toEqual(["  orders?: Orders[];"]);
  });
});
