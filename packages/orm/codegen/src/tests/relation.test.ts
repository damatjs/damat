import { describe, it, expect } from "bun:test";
import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";
import { relationFields } from "../relation/relationFields";

describe("buildRelationMap", () => {
  it("groups relations by source table", () => {
    const relationships: RelationSchema[] = [
      { from: "post", to: "user", type: "belongsTo", linkedBy: ["user_id"] },
      { from: "post", to: "comment", type: "hasMany", linkedBy: [] },
      { from: "comment", to: "user", type: "belongsTo", linkedBy: ["user_id"] },
    ];

    const map = buildRelationMap(relationships);

    expect(map.get("post")?.length).toBe(2);
    expect(map.get("comment")?.length).toBe(1);
    expect(map.has("user")).toBe(false);
  });

  it("returns empty map for no relationships", () => {
    const map = buildRelationMap([]);
    expect(map.size).toBe(0);
  });

  it("handles multiple relations from same table", () => {
    const relationships: RelationSchema[] = [
      { from: "order", to: "user", type: "belongsTo", linkedBy: ["user_id"] },
      { from: "order", to: "product", type: "belongsTo", linkedBy: ["product_id"] },
      { from: "order", to: "payment", type: "hasOne", linkedBy: [] },
    ];

    const map = buildRelationMap(relationships);
    const orderRels = map.get("order");

    expect(orderRels?.length).toBe(3);
  });
});

describe("relationFields", () => {
  it("generates belongsTo relation field", () => {
    const fields = relationFields([
      { from: "post", to: "user", type: "belongsTo", linkedBy: ["user_id"] },
    ]);
    expect(fields).toEqual(["  user?: User;"]);
  });

  it("generates hasMany relation field with plural name", () => {
    const fields = relationFields([
      { from: "user", to: "post", type: "hasMany", linkedBy: [] },
    ]);
    expect(fields).toEqual(["  posts?: Post[];"]);
  });

  it("generates hasOne relation field", () => {
    const fields = relationFields([
      { from: "user", to: "profile", type: "hasOne", linkedBy: [] },
    ]);
    expect(fields).toEqual(["  profile?: Profile;"]);
  });

  it("handles singular table name in hasMany", () => {
    const fields = relationFields([
      { from: "category", to: "product", type: "hasMany", linkedBy: [] },
    ]);
    expect(fields).toEqual(["  products?: Product[];"]);
  });

  it("handles table name already ending with 's' in hasMany", () => {
    const fields = relationFields([
      { from: "school", to: "class", type: "hasMany", linkedBy: [] },
    ]);
    expect(fields).toEqual(["  class?: Class[];"]);
  });

  it("uses camelCase derived field name when no linkedBy", () => {
    const fields = relationFields([
      { from: "item", to: "order_item", type: "belongsTo", linkedBy: [] },
    ]);
    expect(fields).toEqual(["  orderItem?: OrderItem;"]);
  });

  it("returns empty array for no relations", () => {
    expect(relationFields([])).toEqual([]);
  });

  it("handles multiple relations", () => {
    const fields = relationFields([
      { from: "post", to: "user", type: "belongsTo", linkedBy: ["user_id"] },
      { from: "post", to: "comment", type: "hasMany", linkedBy: [] },
      { from: "post", to: "metadata", type: "hasOne", linkedBy: [] },
    ]);

    expect(fields).toEqual([
      "  user?: User;",
      "  comments?: Comment[];",
      "  metadata?: Metadata;",
    ]);
  });
});
