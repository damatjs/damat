import { describe, it, expect } from "bun:test";
import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";

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
