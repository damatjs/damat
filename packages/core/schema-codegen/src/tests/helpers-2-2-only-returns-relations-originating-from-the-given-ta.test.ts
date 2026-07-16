import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { getRelationImports } from "../generator/helpers";

describe("getRelationImports", () => {
  const schema: ModuleSchema = {
    moduleName: "blog",
    tables: [],
    relationships: [
      {
        fromTable: "post",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
      {
        fromTable: "post",
        from: "comments",
        to: "comment_items",
        type: "hasMany",
        linkedBy: [],
      },
      {
        fromTable: "other",
        from: "x",
        to: "things",
        type: "belongsTo",
        linkedBy: [],
      },
    ],
  };

  it("only returns relations originating from the given table", () => {
    expect(getRelationImports("other", schema)).toEqual([
      { typeName: "Things", fileName: "things" },
    ]);
  });
});
