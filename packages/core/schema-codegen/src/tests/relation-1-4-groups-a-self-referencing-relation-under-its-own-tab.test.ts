import { describe, it, expect } from "bun:test";
import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";

describe("buildRelationMap", () => {
  it("groups a self-referencing relation under its own table", () => {
    const relationships: RelationSchema[] = [
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
    ];

    const map = buildRelationMap(relationships);

    // Both sides live under the one table key — self-reference is not special.
    expect(map.size).toBe(1);
    expect(map.get("categories")?.length).toBe(2);
  });
});
