import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { getRelationImports } from "../../generator/helpers";

{
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

    it("returns typeName (PascalCase of rel.to) and fileName (kebab of rel.to)", () => {
      expect(getRelationImports("post", schema)).toEqual([
        { typeName: "Users", fileName: "users" },
        { typeName: "CommentItems", fileName: "comment-items" },
      ]);
    });
  });
}

{
  describe("getRelationImports", () => {
    it("returns an empty array when the schema has no relationships field", () => {
      const bare: ModuleSchema = { moduleName: "bare", tables: [] };
      expect(getRelationImports("post", bare)).toEqual([]);
    });
  });
}

{
  describe("getRelationImports", () => {
    it("excludes self-referential relations to avoid a self-import (TS2440)", () => {
      const treeSchema: ModuleSchema = {
        moduleName: "formulary",
        tables: [],
        relationships: [
          {
            fromTable: "category",
            from: "parent",
            to: "category",
            type: "belongsTo",
            linkedBy: ["parent_id"],
          },
          {
            fromTable: "category",
            from: "children",
            to: "category",
            type: "hasMany",
            linkedBy: [],
          },
          {
            fromTable: "category",
            from: "owner",
            to: "users",
            type: "belongsTo",
            linkedBy: ["owner_id"],
          },
        ],
      };

      // The two `category -> category` relations are dropped; only the
      // cross-table `users` import remains.
      expect(getRelationImports("category", treeSchema)).toEqual([
        { typeName: "Users", fileName: "users" },
      ]);
    });
  });
}
