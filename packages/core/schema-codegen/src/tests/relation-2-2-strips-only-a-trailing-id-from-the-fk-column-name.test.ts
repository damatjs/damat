import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("strips only a trailing _id from the FK column name", () => {
    const fields = relationFields([
      {
        fromTable: "orders",
        from: "owner",
        to: "users",
        type: "belongsTo",
        linkedBy: ["created_by_id"],
      },
    ]);
    expect(fields).toEqual(["  created_by?: Users;"]);
  });
});
