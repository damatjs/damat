import { describe, it, expect } from "bun:test";
import { RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";

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
