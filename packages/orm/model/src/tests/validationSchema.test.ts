import { describe, it, expect } from "bun:test";
import {
  validateRelationSchemas,
  assertValidRelationSchemas,
  RelationValidationError,
} from "@/properties/relation/validate/index";
import { RelationSchema } from "@/types/relation";
// import { ModuleSchema } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — build minimal RelationSchema arrays inline.
//
// NOTE: `from` is the source TABLE NAME (not a property name), matching the
// output produced by `toModuleSchema()` / `model.ts:133`.
// `mappedBy` records the property name on the OTHER side that links back.
// ─────────────────────────────────────────────────────────────────────────────

function belongsTo(
  fromTable: string,
  toTable: string,
  mappedBy?: string[],
  linkedBy?: string[],
): RelationSchema {
  return {
    from: fromTable,
    to: toTable,
    type: "belongsTo",
    ...(mappedBy ? { mappedBy } : {}),
    ...(linkedBy ? { linkedBy } : {}),
  };
}

function hasMany(
  fromTable: string,
  toTable: string,
  mappedBy?: string[],
): RelationSchema {
  return {
    from: fromTable,
    to: toTable,
    type: "hasMany",
    ...(mappedBy ? { mappedBy } : {}),
  };
}

function hasOne(
  fromTable: string,
  toTable: string,
  mappedBy?: string[],
): RelationSchema {
  return {
    from: fromTable,
    to: toTable,
    type: "hasOne",
    ...(mappedBy ? { mappedBy } : {}),
  };
}

// const snapshot = require("./__snapshots__/module.snap.json") as ModuleSchema;
// ─────────────────────────────────────────────────────────────────────────────
// Clean — no violations
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelationSchemas › clean (no violations)", () => {
  // it("fully wired belongsTo + hasMany passes", () => {
  //   // post.author → user (belongsTo), mappedBy = "posts" on user
  //   // user.posts → post (hasMany), mappedBy = "author" on post
  //   const relationships: RelationSchema[] = snapshot.relationships;
  //   const result = validateRelationSchemas(relationships);
  //   console.log("result", result)
  //   expect(result.valid).toBe(true);
  //   expect(result.violations).toHaveLength(0);
  // });

  it("fully wired belongsTo + hasMany passes", () => {
    // post.author → user (belongsTo), mappedBy = "posts" on user
    // user.posts → post (hasMany), mappedBy = "author" on post
    const relationships: RelationSchema[] = [
      belongsTo("post", "user", ["posts"], ["user_id"]),
      hasMany("user", "post", ["author"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fully wired belongsTo + hasOne passes", () => {
    const relationships: RelationSchema[] = [
      belongsTo("profile", "account", ["profile"], ["account_id"]),
      hasOne("account", "profile", ["owner"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("belongsTo without mappedBy passes (no inverse to validate)", () => {
    const relationships: RelationSchema[] = [
      belongsTo("comment", "post", undefined, ["post_id"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(true);
  });

  it("hasMany without mappedBy passes (one-sided)", () => {
    const relationships: RelationSchema[] = [hasMany("article", "tag")];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(true);
  });

  it("empty relationships array passes", () => {
    const result = validateRelationSchemas([]);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("real ecommerce snapshot relationships — one-sided, no inverse entries", () => {
    // The ecommerce fixtures only declare belongsTo/hasMany on one side each,
    // so mappedBy cross-checks cannot pass. A fully symmetric snapshot would
    // need both a belongsTo and its matching hasMany entry in the array.
    // This test documents that the snapshot is intentionally one-sided.
    const relationships: RelationSchema[] = [
      belongsTo("product", "category", ["category"], ["category_id"]),
      belongsTo("order_item", "order", ["order"], ["order_id"]),
      belongsTo("order_item", "product", ["product"], ["product_id"]),
      hasMany("user", "order", ["user"]),
    ];
    const result = validateRelationSchemas(relationships);
    // All four entries declare mappedBy but have no inverse counterpart.
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBe(4);
  });

  it("symmetric pairs (belongsTo + hasMany both with mappedBy) pass", () => {
    // post.author → user (belongsTo), inverse = user.posts
    // user.posts → post (hasMany), FK side = post.author
    const relationships: RelationSchema[] = [
      belongsTo("post", "user", ["posts"], ["user_id"]),
      hasMany("user", "post", ["author"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// missing_inverse — belongsTo with mappedBy but no matching hasMany/hasOne
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelationSchemas › missing_inverse", () => {
  it("detects belongsTo with mappedBy but no inverse entry in array", () => {
    const relationships: RelationSchema[] = [
      // item → order (belongsTo), claims there is a hasMany on order → item
      // but no such entry exists
      belongsTo("item", "order", ["items"], ["order_id"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(false);
    const v = result.violations.find((x) => x.kind === "missing_inverse");
    expect(v).toBeDefined();
    expect(v!.sourceTable).toBe("item");
    expect(v!.targetTable).toBe("order");
    expect(v!.sourceType).toBe("belongsTo");
    expect(v!.expectedType).toBe("hasMany");
  });

  it("detects two independent missing inverses", () => {
    const relationships: RelationSchema[] = [
      belongsTo("item_a", "order", ["items"], ["order_id"]),
      belongsTo("item_b", "order", ["items"], ["order_id"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(false);
    expect(
      result.violations.filter((v) => v.kind === "missing_inverse"),
    ).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// missing_belongsTo — hasMany/hasOne with mappedBy but no matching belongsTo
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelationSchemas › missing_belongsTo", () => {
  it("detects hasMany with mappedBy but no inverse belongsTo entry", () => {
    const relationships: RelationSchema[] = [
      // author → book (hasMany), claims book.author is a belongsTo
      // but no belongsTo(book → author) entry exists
      hasMany("author", "book", ["author"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(false);
    const v = result.violations.find((x) => x.kind === "missing_belongsTo");
    expect(v).toBeDefined();
    expect(v!.sourceTable).toBe("author");
    expect(v!.targetTable).toBe("book");
    expect(v!.expectedType).toBe("belongsTo");
  });

  it("detects hasOne with mappedBy but no inverse belongsTo entry", () => {
    const relationships: RelationSchema[] = [
      hasOne("person", "passport", ["owner"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(false);
    const v = result.violations[0]!;
    expect(v.kind).toBe("missing_belongsTo");
    expect(v.targetProp).toBe("owner");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// All violations collected — never stops at first error
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelationSchemas › collects all violations", () => {
  it("returns every violation, not just the first", () => {
    const relationships: RelationSchema[] = [
      // Two independent broken hasMany — each missing their belongsTo
      hasMany("group_a", "member_a", ["group_a"]),
      hasMany("group_b", "member_b", ["group_b"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    const kinds = result.violations.map((v) => v.kind);
    expect(kinds.every((k) => k === "missing_belongsTo")).toBe(true);
  });

  it("collects both missing_inverse and missing_belongsTo violations", () => {
    const relationships: RelationSchema[] = [
      // broken belongsTo (no inverse hasMany)
      belongsTo("post", "user", ["posts"], ["user_id"]),
      // broken hasMany (no inverse belongsTo)
      hasMany("category", "product", ["category"]),
    ];
    const result = validateRelationSchemas(relationships);
    expect(result.valid).toBe(false);
    const kinds = result.violations.map((v) => v.kind);
    expect(kinds).toContain("missing_inverse");
    expect(kinds).toContain("missing_belongsTo");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assertValidRelationSchemas — throws with full formatted message
// ─────────────────────────────────────────────────────────────────────────────

describe("assertValidRelationSchemas", () => {
  it("throws RelationValidationError listing all violations", () => {
    const relationships: RelationSchema[] = [
      hasMany("y", "x", ["y"]), // missing belongsTo on x
    ];
    let thrown: RelationValidationError | undefined;
    try {
      assertValidRelationSchemas(relationships);
    } catch (e) {
      thrown = e as RelationValidationError;
    }
    expect(thrown).toBeInstanceOf(RelationValidationError);
    expect(thrown!.violations.length).toBeGreaterThan(0);
    expect(thrown!.message).toContain("missing_belongsTo");
    expect(thrown!.message).toContain("Fix:");
  });

  it("passes silently for a fully wired snapshot", () => {
    const relationships: RelationSchema[] = [
      belongsTo("comment", "post", ["comments"], ["post_id"]),
      hasMany("post", "comment", ["post"]),
    ];
    expect(() => assertValidRelationSchemas(relationships)).not.toThrow();
  });

  it("error message includes a count header", () => {
    const relationships: RelationSchema[] = [
      // belongsTo with mappedBy, no inverse → missing_inverse
      belongsTo("t2", "t1", ["t2s"], ["t1_id"]),
    ];
    let thrown: RelationValidationError | undefined;
    try {
      assertValidRelationSchemas(relationships);
    } catch (e) {
      thrown = e as RelationValidationError;
    }
    expect(thrown!.message).toMatch(/Found \d+ relation violation/);
  });
});
