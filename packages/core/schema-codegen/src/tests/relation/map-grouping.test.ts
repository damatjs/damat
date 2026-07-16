import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";
import { describe, it, expect } from "bun:test";

{
  describe("buildRelationMap", () => {
    it("groups relations by source table", () => {
      const relationships: RelationSchema[] = [
        {
          fromTable: "posts",
          from: "user",
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
          fromTable: "comments",
          from: "user",
          to: "users",
          type: "belongsTo",
          linkedBy: ["user_id"],
        },
      ];

      const map = buildRelationMap(relationships);

      expect(map.get("posts")?.length).toBe(2);
      expect(map.get("comments")?.length).toBe(1);
      expect(map.has("users")).toBe(false);
    });
  });
}

{
  describe("buildRelationMap", () => {
    it("handles multiple relations from same table", () => {
      const relationships: RelationSchema[] = [
        {
          fromTable: "orders",
          from: "user",
          to: "users",
          type: "belongsTo",
          linkedBy: ["user_id"],
        },
        {
          fromTable: "orders",
          from: "product",
          to: "products",
          type: "belongsTo",
          linkedBy: ["product_id"],
        },
        {
          fromTable: "orders",
          from: "payment",
          to: "payments",
          type: "hasOne",
          linkedBy: [],
        },
      ];

      const map = buildRelationMap(relationships);
      const orderRels = map.get("orders");

      expect(orderRels?.length).toBe(3);
    });
  });
}
