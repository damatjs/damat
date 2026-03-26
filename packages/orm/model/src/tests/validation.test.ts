import { describe, it, expect } from "bun:test";
import { model } from "@/schema";
import { columns } from "@/properties";
import {
  validateRelations,
  assertValidRelations,
  RelationValidationError,
} from "@/properties/relation/validate/index";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — tiny inline models so each test is self-contained
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelations › clean (no violations)", () => {
  it("fully wired belongsTo + hasMany passes", () => {
    const Post = model("post", {
      id: columns.id().primaryKey(),
      author: columns.belongsTo(() => User),
    });
    const User = model("user", {
      id: columns.id().primaryKey(),
      posts: columns.hasMany(Post).mappedBy("author"),
    });
    const result = validateRelations([User, Post]);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fully wired belongsTo + hasOne passes", () => {
    const Profile = model("profile", {
      id: columns.id().primaryKey(),
      owner: columns.belongsTo(() => Account),
    });
    const Account = model("account", {
      id: columns.id().primaryKey(),
      profile: columns.hasOne(Profile).mappedBy("owner"),
    });
    const result = validateRelations([Account, Profile]);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("hasMany without mappedBy passes (one-sided, nothing to validate)", () => {
    const Tag = model("tag", { id: columns.id().primaryKey() });
    const Article = model("article", {
      id: columns.id().primaryKey(),
      tags: columns.hasMany(Tag),
    });
    const result = validateRelations([Article, Tag]);
    expect(result.valid).toBe(true);
  });

  it("target model not in the list is skipped silently", () => {
    const External = model("external", { id: columns.id().primaryKey() });
    const Local = model("local", {
      id: columns.id().primaryKey(),
      ext: columns.belongsTo(External),
    });
    // External is intentionally omitted — should not error
    const result = validateRelations([Local]);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// missing_inverse — belongsTo has no hasMany/hasOne on target
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelations › missing_inverse", () => {
  it("detects belongsTo with explicit mappedBy but no inverse on target", () => {
    const Order = model("order", { id: columns.id().primaryKey() });
    const Item = model("item", {
      id: columns.id().primaryKey(),
      // explicit mappedBy → validator must find "items" on Order
      order: columns.belongsTo(Order, { mappedBy: "items" }),
    });
    const CartItem = model("cart_item", {
      id: columns.id().primaryKey(),
      // explicit mappedBy → validator must find "items" on Order
      order: columns.belongsTo(Order, { mappedBy: "items" }),
    });
    const result = validateRelations([Order, Item, CartItem]);
    expect(result.valid).toBe(false);
    const v = result.violations.find((x) => x.kind === "missing_inverse");
    expect(v).toBeDefined();
    expect(v!.sourceTable).toBe("item");
    expect(v!.sourceProp).toBe("order");
    expect(v!.targetTable).toBe("order");
    expect(v!.targetProp).toBe("items");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// missing_belongsTo — hasMany mappedBy points to non-existent property
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelations › missing_belongsTo", () => {
  it("detects hasMany mappedBy pointing to missing property on target", () => {
    const Book = model("book", {
      id: columns.id().primaryKey(),
      title: columns.text(),
      // no "author" belongsTo
    });
    const Author = model("author", {
      id: columns.id().primaryKey(),
      books: columns.hasMany(Book).mappedBy("author"),
    });
    const result = validateRelations([Author, Book]);
    expect(result.valid).toBe(false);
    const v = result.violations.find((x) => x.kind === "missing_belongsTo");
    expect(v).toBeDefined();
    expect(v!.sourceTable).toBe("author");
    expect(v!.sourceProp).toBe("books");
    expect(v!.targetTable).toBe("book");
    expect(v!.targetProp).toBe("author");
    expect(v!.expectedType).toBe("belongsTo");
  });

  it("detects hasOne mappedBy pointing to missing property on target", () => {
    const Passport = model("passport", { id: columns.id().primaryKey() });
    const Person = model("person", {
      id: columns.id().primaryKey(),
      passport: columns.hasOne(Passport).mappedBy("owner"),
    });
    const result = validateRelations([Person, Passport]);
    expect(result.valid).toBe(false);
    const v = result.violations[0]!;
    expect(v.kind).toBe("missing_belongsTo");
    expect(v.targetProp).toBe("owner");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wrong_type — back-reference exists but is not the right relation kind
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelations › wrong_type", () => {
  it("detects hasMany mappedBy pointing to a plain column", () => {
    const Member = model("member", {
      id: columns.id().primaryKey(),
      group: columns.text(), // a column, not a belongsTo
    });
    const Group = model("group", {
      id: columns.id().primaryKey(),
      members: columns.hasMany(Member).mappedBy("group"),
    });
    const result = validateRelations([Group, Member]);
    expect(result.valid).toBe(false);
    const v = result.violations.find((x) => x.kind === "wrong_type");
    expect(v).toBeDefined();
    expect(v!.sourceTable).toBe("group");
    expect(v!.targetTable).toBe("member");
    expect(v!.targetProp).toBe("group");
    expect(v!.expectedType).toBe("belongsTo");
  });

  it("detects belongsTo inverse pointing to a plain column", () => {
    const Team = model("team", {
      id: columns.id().primaryKey(),
      players: columns.text(), // should be hasMany, not a column
    });
    // Force the mapping to "players" via explicit RelationOptions
    const Player2 = model("player2", {
      id: columns.id().primaryKey(),
      team: columns.belongsTo(Team, { mappedBy: "players" }),
    });
    const result = validateRelations([Team, Player2]);
    expect(result.valid).toBe(false);
    const v = result.violations.find((x) => x.kind === "wrong_type");
    expect(v).toBeDefined();
    expect(v!.expectedType).toBe("hasMany");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mappedBy_mismatch — both sides exist and are correct types, but disagree
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelations › mappedBy_mismatch", () => {
  it("detects mismatched mappedBy between belongsTo and hasMany", () => {
    const Post = model("post2", {
      id: columns.id().primaryKey(),
      // explicit mappedBy says the inverse on user2 is "articles"
      writer: columns.belongsTo(() => User3, { mappedBy: "articles" }),
    });
    const User3 = model("user3", {
      id: columns.id().primaryKey(),
      // inverse mappedBy says the FK prop on post2 is "author" — not "writer"
      articles: columns.hasMany(Post).mappedBy("author"),
    });
    const result = validateRelations([User3, Post]);
    // checkBelongsTo: post2.writer has explicit mappedBy "articles",
    // finds user3.articles (hasMany), its getMappedBy()="author" ≠ "writer" → mismatch
    const mismatch = result.violations.find(
      (x) => x.kind === "mappedBy_mismatch",
    );
    expect(mismatch).toBeDefined();
    expect(mismatch!.sourceTable).toBe("post2");
    expect(mismatch!.targetTable).toBe("user3");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// All violations collected — never stops at first error
// ─────────────────────────────────────────────────────────────────────────────

describe("validateRelations › collects all violations", () => {
  it("returns every violation across all models, not just the first", () => {
    // Two independent broken hasMany → missing belongsTo on each target
    const A = model("aa", { id: columns.id().primaryKey() });
    const B = model("bb", {
      id: columns.id().primaryKey(),
      // mappedBy "bb_items" → missing on A
      items: columns.hasMany(A).mappedBy("bb_items"),
    });
    const C = model("cc", { id: columns.id().primaryKey() });
    const D = model("dd", {
      id: columns.id().primaryKey(),
      // mappedBy "dd_items" → missing on C
      items: columns.hasMany(C).mappedBy("dd_items"),
    });
    const result = validateRelations([A, B, C, D]);
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
    const kinds = result.violations.map((v) => v.kind);
    expect(kinds.every((k) => k === "missing_belongsTo")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// assertValidRelations — throws with full formatted message
// ─────────────────────────────────────────────────────────────────────────────

describe("assertValidRelations", () => {
  it("throws RelationValidationError listing all violations", () => {
    const X = model("x", { id: columns.id().primaryKey() });
    const Y = model("y", {
      id: columns.id().primaryKey(),
      xs: columns.hasMany(X).mappedBy("y"), // missing belongsTo on X
    });
    let thrown: RelationValidationError | undefined;
    try {
      assertValidRelations([X, Y]);
    } catch (e) {
      thrown = e as RelationValidationError;
    }
    expect(thrown).toBeInstanceOf(RelationValidationError);
    expect(thrown!.violations.length).toBeGreaterThan(0);
    // Message should contain the violation kind
    expect(thrown!.message).toContain("missing_belongsTo");
    // Message should name both tables
    expect(thrown!.message).toContain("y");
    expect(thrown!.message).toContain("x");
    // Message should include a Fix hint
    expect(thrown!.message).toContain("Fix:");
  });

  it("passes silently for a fully wired module", () => {
    const Comment = model("comment", {
      id: columns.id().primaryKey(),
      post: columns.belongsTo(() => Article),
    });
    const Article = model("article", {
      id: columns.id().primaryKey(),
      comments: columns.hasMany(Comment).mappedBy("post"),
    });
    expect(() => assertValidRelations([Article, Comment])).not.toThrow();
  });

  it("error message includes a count header", () => {
    const T1 = model("t1", { id: columns.id().primaryKey() });
    const T2 = model("t2", {
      id: columns.id().primaryKey(),
      // explicit mappedBy → triggers missing_inverse
      t1: columns.belongsTo(T1, { mappedBy: "t2s" }),
    });
    let thrown: RelationValidationError | undefined;
    try {
      assertValidRelations([T1, T2]);
    } catch (e) {
      thrown = e as RelationValidationError;
    }
    expect(thrown!.message).toMatch(/Found \d+ relation violation/);
  });
});
