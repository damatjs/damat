import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("PascalCases a snake_case target table name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "orderItems",
        to: "order_items",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  orderItems?: OrderItems[];"]);
  });
});
