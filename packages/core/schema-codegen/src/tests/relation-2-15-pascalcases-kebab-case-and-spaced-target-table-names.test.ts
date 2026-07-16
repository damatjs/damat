import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("PascalCases kebab-case and spaced target table names", () => {
    const fields = relationFields([
      {
        fromTable: "orders",
        from: "orderItems",
        to: "order-items",
        type: "hasMany",
        linkedBy: [],
      },
      {
        fromTable: "orders",
        from: "shippingLabel",
        to: "shipping label",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual([
      "  orderItems?: OrderItems[];",
      "  shippingLabel?: ShippingLabel;",
    ]);
  });
});
