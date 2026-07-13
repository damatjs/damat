import { describe, it, expect } from "bun:test";
import {
  getModelRelationNames,
  resolveModelRelations,
  assertValidRelationMap,
} from "../../src/query/relations/resolver";
import { RelationGuardError } from "../../src/query/relations/error";
import { compileRelCondition } from "../../src/query/select/lateral/condition";
import { UserModel, PostModel, NoSchemaModel } from "../helpers/fixtures";
import { model, columns } from "@damatjs/orm-model";
import type { ModelDefinition } from "@damatjs/orm-model";

describe("getModelRelationNames", () => {
  it("collects relation property names only (not plain columns)", () => {
    const names = getModelRelationNames(UserModel);
    expect(names.has("posts")).toBe(true);
    expect(names.has("id")).toBe(false);
    expect(names.has("email")).toBe(false);
  });

  it("returns an empty set for a model with no relations", () => {
    expect(getModelRelationNames(NoSchemaModel).size).toBe(0);
  });
});

describe("resolveModelRelations", () => {
  it("resolves a belongsTo with its explicit foreign key + reference", () => {
    const resolved = resolveModelRelations(PostModel);
    const author = resolved.get("author")!;
    expect(author.type).toBe("belongsTo");
    expect(author.foreignKey).toEqual(["author_id"]);
    expect(author.references).toEqual(["id"]);
    expect(author.target._tableName).toBe("user");
  });

  it("resolves a hasMany via mappedBy back to the belongsTo's FK", () => {
    const resolved = resolveModelRelations(UserModel);
    const posts = resolved.get("posts")!;
    expect(posts.type).toBe("hasMany");
    // mappedBy "author" → PostModel.author belongsTo, FK author_id, ref id
    expect(posts.foreignKey).toEqual(["author_id"]);
    expect(posts.references).toEqual(["id"]);
    expect(posts.target._tableName).toBe("post");
  });

  it("resolves a hasOne relation (type 'hasOne')", () => {
    // Local models: an account hasOne profile (mappedBy the profile's belongsTo).
    const Profile: ModelDefinition = model("profile", {
      id: columns.text().primaryKey(),
      owner: columns
        .belongsTo(() => Account)
        .link({ foreignKey: "owner_id", reference: "id" }),
    })
      .timestamps(false)
      .softDelete(false);
    const Account: ModelDefinition = model("account", {
      id: columns.text().primaryKey(),
      profile: columns.hasOne(() => Profile).mappedBy("owner"),
    })
      .timestamps(false)
      .softDelete(false);

    const resolved = resolveModelRelations(Account);
    const profile = resolved.get("profile")!;
    expect(profile.type).toBe("hasOne");
    expect(profile.foreignKey).toEqual(["owner_id"]);
    expect(profile.references).toEqual(["id"]);
    expect(profile.target._tableName).toBe("profile");
  });

  it("falls back to '<table>_id' for a hasMany with no resolvable mappedBy FK", () => {
    // hasMany with NO mappedBy → resolver synthesises the default FK
    // `<owner table>_id` (exercises the fkCols.length === 0 default branch).
    const Item: ModelDefinition = model("item", {
      id: columns.text().primaryKey(),
    })
      .timestamps(false)
      .softDelete(false);
    const Cart: ModelDefinition = model("cart", {
      id: columns.text().primaryKey(),
      items: columns.hasMany(() => Item),
    })
      .timestamps(false)
      .softDelete(false);

    const resolved = resolveModelRelations(Cart);
    const items = resolved.get("items")!;
    expect(items.type).toBe("hasMany");
    // No mappedBy → default FK is "<owner table>_id" = "cart_id", ref defaults to id.
    expect(items.foreignKey).toEqual(["cart_id"]);
    expect(items.references).toEqual(["id"]);
  });
});

describe("assertValidRelationMap", () => {
  it("passes for known relation keys", () => {
    expect(() =>
      assertValidRelationMap(UserModel, { posts: true }),
    ).not.toThrow();
  });

  it("throws RelationGuardError for unknown relation keys", () => {
    expect(() => assertValidRelationMap(UserModel, { ghost: true })).toThrow(
      RelationGuardError,
    );
  });
});

describe("RelationGuardError", () => {
  it("carries model name, unknown relation, and available list", () => {
    const err = new RelationGuardError("user", "ghost", ["posts"]);
    expect(err.name).toBe("RelationGuardError");
    expect(err.modelName).toBe("user");
    expect(err.unknownRelation).toBe("ghost");
    expect(err.availableRelations).toEqual(["posts"]);
    expect(err.message).toContain('Unknown relation "ghost"');
    expect(err.message).toContain("posts");
  });

  it("shows '(none defined)' when there are no relations", () => {
    const err = new RelationGuardError("widget", "x", []);
    expect(err.message).toContain("(none defined)");
  });
});

describe("compileRelCondition (lateral relation conditions)", () => {
  it("null → IS NULL with no param", () => {
    const params: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', null, params)).toBe(
      '"_t"."x" IS NULL',
    );
    expect(params).toEqual([]);
  });

  it("scalar → equality param", () => {
    const params: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', 5, params)).toBe('"_t"."x" = $1');
    expect(params).toEqual([5]);
  });

  it("operator object with multiple ops ANDed", () => {
    const params: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', { gte: 1, lte: 9 }, params)).toBe(
      '"_t"."x" >= $1 AND "_t"."x" <= $2',
    );
    expect(params).toEqual([1, 9]);
  });

  it("IN / NOT IN with empty arrays → FALSE / TRUE", () => {
    const p1: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', { in: [] }, p1)).toBe("FALSE");
    const p2: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', { notIn: [] }, p2)).toBe("TRUE");
  });

  it("between produces two params", () => {
    const params: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', { between: [1, 2] }, params)).toBe(
      '"_t"."x" BETWEEN $1 AND $2',
    );
    expect(params).toEqual([1, 2]);
  });

  it("empty operator object falls back to TRUE", () => {
    const params: unknown[] = [];
    expect(compileRelCondition('"_t"."x"', {}, params)).toBe("TRUE");
  });
});
