import { describe, it, expect } from "bun:test";
import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";

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
