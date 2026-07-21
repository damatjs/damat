import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";
import { describe, it, expect } from "bun:test";

{
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
}

{
  describe("buildRelationMap", () => {
    it("keeps duplicate relations between the same pair, in insertion order", () => {
      const relationships: RelationSchema[] = [
        {
          fromTable: "posts",
          from: "author",
          to: "users",
          type: "belongsTo",
          linkedBy: ["author_id"],
        },
        {
          fromTable: "posts",
          from: "reviewer",
          to: "users",
          type: "belongsTo",
          linkedBy: ["reviewer_id"],
        },
      ];

      const map = buildRelationMap(relationships);
      const postRels = map.get("posts");

      expect(postRels?.length).toBe(2);
      // No dedupe/reorder — the map preserves the order relations were given in.
      expect(postRels?.map((r) => r.from)).toEqual(["author", "reviewer"]);
    });
  });
}
