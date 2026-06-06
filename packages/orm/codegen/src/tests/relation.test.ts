import { describe, it, expect } from "bun:test";
import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";
import { relationFields } from "../relation/relationFields";

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

  it("returns empty map for no relationships", () => {
    const map = buildRelationMap([]);
    expect(map.size).toBe(0);
  });

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

describe("relationFields", () => {
  it("generates belongsTo relation field", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
    ]);
    expect(fields).toEqual(["  user?: User;"]);
  });

  it("generates hasMany relation field with plural name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "posts",
        to: "posts",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  posts?: Post[];"]);
  });

  it("generates hasOne relation field", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "profile",
        to: "profiles",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  profile?: Profile;"]);
  });

  it("handles singular table name in hasMany", () => {
    const fields = relationFields([
      {
        fromTable: "categories",
        from: "products",
        to: "products",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  products?: Product[];"]);
  });

  it("handles table name already ending with 's' in hasMany", () => {
    const fields = relationFields([
      {
        fromTable: "schools",
        from: "classes",
        to: "classes",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  classes?: Class[];"]);
  });

  it("uses camelCase derived field name when no linkedBy", () => {
    const fields = relationFields([
      {
        fromTable: "items",
        from: "orderItem",
        to: "order_items",
        type: "belongsTo",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  orderItem?: OrderItem;"]);
  });

  it("returns empty array for no relations", () => {
    expect(relationFields([])).toEqual([]);
  });

  it("handles multiple relations", () => {
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
      "  user?: User;",
      "  comments?: Comment[];",
      "  metadata?: Metadata;",
    ]);
  });
});
