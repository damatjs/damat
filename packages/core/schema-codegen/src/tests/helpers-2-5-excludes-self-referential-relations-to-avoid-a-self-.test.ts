import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { getRelationImports } from "../generator/helpers";

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
