import { describe, it, expect } from "bun:test";
import { relationFields } from "../relation/relationFields";

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
