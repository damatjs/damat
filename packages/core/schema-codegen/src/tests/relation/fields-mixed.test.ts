import { describe, it, expect } from "bun:test";
import { relationFields } from "../../relation/relationFields";

{
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
}

{
  describe("relationFields", () => {
    it("emits self-referencing fields typed as the table's own interface", () => {
      const fields = relationFields([
        {
          fromTable: "categories",
          from: "parent",
          to: "categories",
          type: "belongsTo",
          linkedBy: ["parent_id"],
        },
        {
          fromTable: "categories",
          from: "children",
          to: "categories",
          type: "hasMany",
          linkedBy: [],
        },
      ]);

      // fromTable === to: both fields point back at the `Categories` interface.
      expect(fields).toEqual([
        "  parent?: Categories;",
        "  children?: Categories[];",
      ]);
    });
  });
}

{
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
}
