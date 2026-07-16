import { describe, it, expect } from "bun:test";
import { relationFields } from "../../relation/relationFields";

{
  describe("relationFields", () => {
    it("falls back to rel.from for belongsTo when linkedBy is undefined", () => {
      const fields = relationFields([
        {
          fromTable: "posts",
          from: "author",
          to: "users",
          type: "belongsTo",
        },
      ]);
      expect(fields).toEqual(["  author?: Users;"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("generates hasOne field as singular using rel.from for the name", () => {
      const fields = relationFields([
        {
          fromTable: "users",
          from: "profile",
          to: "profiles",
          type: "hasOne",
          linkedBy: [],
        },
      ]);
      expect(fields).toEqual(["  profile?: Profiles;"]);
    });
  });
}

{
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
}

{
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
}
