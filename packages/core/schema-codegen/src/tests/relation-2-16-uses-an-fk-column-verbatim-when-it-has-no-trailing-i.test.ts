import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("uses an FK column verbatim when it has no trailing _id", () => {
    const fields = relationFields([
      {
        fromTable: "sessions",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_uuid"],
      },
    ]);
    // Only a trailing `_id` is stripped — other suffixes stay as-is.
    expect(fields).toEqual(["  user_uuid?: Users;"]);
  });
});
