import { describe, it, expect } from "bun:test";
import { relationFields } from "../../relation/relationFields";

{
  describe("relationFields", () => {
    // The generated field TYPE is `toPascalCase(rel.to)` verbatim — the target
    // table name as-written. There is no singularisation, so a relation `to:
    // "users"` references the `Users` interface (which is what the row-interface
    // generator emits for a table named `users`). Field NAMES come from the FK
    // column (belongsTo, `_id` stripped) or `rel.from` (hasMany / hasOne).

    it("generates belongsTo field; name from FK column, type from rel.to", () => {
      const fields = relationFields([
        {
          fromTable: "posts",
          from: "author",
          to: "users",
          type: "belongsTo",
          linkedBy: ["user_id"],
        },
      ]);
      // FK `user_id` → name `user`; target `users` → type `Users`.
      expect(fields).toEqual(["  user?: Users;"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("returns empty array for no relations", () => {
      expect(relationFields([])).toEqual([]);
    });
  });
}

{
  describe("relationFields", () => {
    it("gives multiple relations to the same target distinct FK-derived names", () => {
      const fields = relationFields([
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
      ]);

      // Same target type twice — names disambiguated by the FK column.
      expect(fields).toEqual(["  author?: Users;", "  reviewer?: Users;"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("uses an FK column verbatim when it has no trailing _id", () => {
      const fields = relationFields([
        {
          fromTable: "sessions",
          from: "user",
          to: "users",
          type: "belongsTo",
          linkedBy: ["user_uuid"],
        },
      ]);
      // Only a trailing `_id` is stripped — other suffixes stay as-is.
      expect(fields).toEqual(["  user_uuid?: Users;"]);
    });
  });
}

{
  describe("relationFields", () => {
    it("falls back to rel.from for belongsTo when linkedBy is empty", () => {
      const fields = relationFields([
        {
          fromTable: "posts",
          from: "author",
          to: "users",
          type: "belongsTo",
          linkedBy: [],
        },
      ]);
      // No FK column → use the property name `author`; type from `users`.
      expect(fields).toEqual(["  author?: Users;"]);
    });
  });
}
