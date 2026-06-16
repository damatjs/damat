import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { tableToFileName, getRelationImports } from "../../generator/helpers";

describe("tableToFileName", () => {
  it("converts snake_case to kebab-case", () => {
    expect(tableToFileName("order_item")).toBe("order-item");
    expect(tableToFileName("a_b_c")).toBe("a-b-c");
  });

  it("leaves a single-word name unchanged", () => {
    expect(tableToFileName("user")).toBe("user");
  });

  it("replaces every underscore", () => {
    expect(tableToFileName("very_long_table_name")).toBe("very-long-table-name");
  });
});

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

  it("only returns relations originating from the given table", () => {
    expect(getRelationImports("other", schema)).toEqual([
      { typeName: "Things", fileName: "things" },
    ]);
  });

  it("returns an empty array for a table with no relations", () => {
    expect(getRelationImports("unknown", schema)).toEqual([]);
  });

  it("returns an empty array when the schema has no relationships field", () => {
    const bare: ModuleSchema = { moduleName: "bare", tables: [] };
    expect(getRelationImports("post", bare)).toEqual([]);
  });
});
