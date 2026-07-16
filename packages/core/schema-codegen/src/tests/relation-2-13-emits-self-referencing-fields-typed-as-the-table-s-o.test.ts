import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

describe("relationFields", () => {
  it("emits self-referencing fields typed as the table's own interface", () => {
    const fields = relationFields([
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
    ]);

    // fromTable === to: both fields point back at the `Categories` interface.
    expect(fields).toEqual([
      "  parent?: Categories;",
      "  children?: Categories[];",
    ]);
  });
});
