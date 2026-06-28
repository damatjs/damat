import { describe, it, expect } from "bun:test";
import { indexBuilder } from "@/properties/indexes";

describe("indexBuilder factory", () => {
  it("creates an IndexBuilder seeded with the given name", () => {
    const schema = indexBuilder("user_email_idx").columns(["email"]).toSchema("user");
    expect(schema.name).toBe("user_email_idx");
  });
});

describe("IndexBuilder fluent options", () => {
  it("where() attaches a partial index predicate", () => {
    const schema = indexBuilder("u_idx")
      .columns(["email"])
      .where("deleted_at IS NULL")
      .toSchema("user");
    expect(schema.where).toBe("deleted_at IS NULL");
  });

  it("concurrently() is chainable but cleanupIndexSchema does not surface it", () => {
    // NOTE: builder records `_concurrently`, but cleanupIndexSchema only copies
    // name/columns/unique/type/where, so `concurrently` is intentionally dropped
    // from the emitted IndexSchema. Locking in the current behavior.
    const builder = indexBuilder("u_idx").columns(["email"]);
    expect(builder.concurrently()).toBe(builder);
    const schema = builder.toSchema("user");
    expect(schema.concurrently).toBeUndefined();
  });
});
