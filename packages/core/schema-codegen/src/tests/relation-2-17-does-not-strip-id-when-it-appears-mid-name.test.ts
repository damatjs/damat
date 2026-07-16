import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("does not strip _id when it appears mid-name", () => {
    const fields = relationFields([
      {
        fromTable: "audits",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id_old"],
      },
    ]);
    expect(fields).toEqual(["  user_id_old?: Users;"]);
  });
});
