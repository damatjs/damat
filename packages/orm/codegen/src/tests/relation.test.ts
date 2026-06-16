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
  // The generated field TYPE is `toPascalCase(rel.to)` verbatim — the target
  // table name as-written. There is no singularisation, so a relation `to:
  // "users"` references the `Users` interface (which is what the row-interface
  // generator emits for a table named `users`). Field NAMES come from the FK
  // column (belongsTo, `_id` stripped) or `rel.from` (hasMany / hasOne).

  it("generates belongsTo field; name from FK column, type from rel.to", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
    ]);
    // FK `user_id` → name `user`; target `users` → type `Users`.
    expect(fields).toEqual(["  user?: Users;"]);
  });

  it("strips only a trailing _id from the FK column name", () => {
    const fields = relationFields([
      {
        fromTable: "orders",
        from: "owner",
        to: "users",
        type: "belongsTo",
        linkedBy: ["created_by_id"],
      },
    ]);
    expect(fields).toEqual(["  created_by?: Users;"]);
  });

  it("falls back to rel.from for belongsTo when linkedBy is empty", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: [],
      },
    ]);
    // No FK column → use the property name `author`; type from `users`.
    expect(fields).toEqual(["  author?: Users;"]);
  });

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

  it("generates hasMany field as an array using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "posts",
        to: "posts",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    // hasMany → array; name = rel.from; type = toPascalCase(rel.to).
    expect(fields).toEqual(["  posts?: Posts[];"]);
  });

  it("ignores linkedBy for hasMany, always using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "orders",
        to: "orders",
        type: "hasMany",
        linkedBy: ["user_id"],
      },
    ]);
    expect(fields).toEqual(["  orders?: Orders[];"]);
  });

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

  it("keeps a singular target name singular (no pluralisation applied)", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "metadata",
        to: "metadata",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  metadata?: Metadata;"]);
  });

  it("returns empty array for no relations", () => {
    expect(relationFields([])).toEqual([]);
  });

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
