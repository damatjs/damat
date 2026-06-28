import { describe, it, expect } from "bun:test";
import { SelectBuilder } from "../../src/query/select";
import { UserModel, PostModel } from "../helpers/fixtures";

/**
 * Coverage for buildSelectJson / buildRelationDescriptor (src/query/select/json.ts):
 * relation descriptors with where / whereRaw (single + array) / orderBy /
 * limit / offset, plus NESTED `with` relations. Pure descriptor building — no DB.
 */

describe("buildRelationDescriptor — full option surface", () => {
  it("captures where, single whereRaw, orderBy, limit and offset", () => {
    const json = new SelectBuilder(UserModel)
      .with({
        posts: {
          select: ["id", "title"],
          where: { published: true },
          whereRaw: { sql: '"title" IS NOT NULL', params: [] },
          orderBy: [{ column: "title", direction: "DESC" }],
          limit: 5,
          offset: 1,
        },
      })
      .generateJson();

    const rel = json.with![0]!;
    expect(rel.relation).toBe("posts");
    expect(rel.columns).toEqual(["id", "title"]);
    expect(rel.where).toEqual([{ published: true }]);
    expect(rel.whereRaw).toEqual([{ sql: '"title" IS NOT NULL', params: [] }]);
    expect(rel.orderBy).toEqual([{ column: "title", direction: "DESC" }]);
    expect(rel.limit).toBe(5);
    expect(rel.offset).toBe(1);
  });

  it("accepts whereRaw as an array of clauses", () => {
    const json = new SelectBuilder(UserModel)
      .with({
        posts: {
          whereRaw: [
            { sql: '"a" = 1', params: [] },
            { sql: '"b" = 2', params: [] },
          ],
        },
      })
      .generateJson();
    expect(json.with![0]!.whereRaw).toEqual([
      { sql: '"a" = 1', params: [] },
      { sql: '"b" = 2', params: [] },
    ]);
  });

  it("omits schema/limit/offset on the relation when the target is schemaless and unset", () => {
    // posts target lives in the "app" schema, so schema IS present; limit/offset
    // are absent because they were not supplied.
    const json = new SelectBuilder(UserModel)
      .with({ posts: true })
      .generateJson();
    const rel = json.with![0]!;
    expect(rel.schema).toBe("app");
    expect("limit" in rel).toBe(false);
    expect("offset" in rel).toBe(false);
    // No select → empty columns; no where/whereRaw/orderBy → empty arrays.
    expect(rel.columns).toEqual([]);
    expect(rel.where).toEqual([]);
    expect(rel.whereRaw).toEqual([]);
    expect(rel.orderBy).toEqual([]);
  });

  it("recurses into NESTED with relations (posts → author)", () => {
    const json = new SelectBuilder(UserModel)
      .with({
        posts: {
          select: ["id"],
          with: {
            author: { select: ["email"] },
          },
        },
      })
      .generateJson();

    const posts = json.with![0]!;
    expect(posts.relation).toBe("posts");
    expect(posts.with).toHaveLength(1);
    const author = posts.with[0]!;
    expect(author.relation).toBe("author");
    expect(author.type).toBe("belongsTo");
    expect(author.columns).toEqual(["email"]);
  });

  it("nested with: `true` becomes empty options, `false` is skipped", () => {
    const json = new SelectBuilder(PostModel)
      .with({
        author: {
          select: ["id"],
          with: {
            // `true` → default (empty) options branch in buildRelationDescriptor
            posts: true,
          },
        },
      })
      .generateJson();

    const author = json.with![0]!;
    expect(author.with).toHaveLength(1);
    expect(author.with[0]!.relation).toBe("posts");
  });
});
