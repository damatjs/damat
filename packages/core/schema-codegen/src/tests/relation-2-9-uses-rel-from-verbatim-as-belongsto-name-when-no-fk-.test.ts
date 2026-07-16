import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("uses rel.from verbatim as belongsTo name when no FK column", () => {
    const fields = relationFields([
      {
        fromTable: "items",
        from: "orderItem",
        to: "order_items",
        type: "belongsTo",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  orderItem?: OrderItems;"]);
  });
});
