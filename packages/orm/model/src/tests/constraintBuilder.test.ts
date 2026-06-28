import { describe, it, expect } from "bun:test";
import { constrainBuilder } from "@/properties/constraints";
import type { ExcludeConstraint } from "@/types";

describe("ConstraintBuilder › unique", () => {
  it("builds a unique constraint with the given name and columns", () => {
    const schema = constrainBuilder("email_uniq").columns(["email"]).unique().toSchema();
    expect(schema.type).toBe("unique");
    expect(schema.name).toBe("email_uniq");
    if (schema.type === "unique") {
      expect(schema.columns).toEqual(["email"]);
    }
  });
});

describe("ConstraintBuilder › primaryKey", () => {
  it("appends _pkey to the name and uses primary_key type", () => {
    const schema = constrainBuilder("orders").columns(["id"]).primaryKey().toSchema();
    expect(schema.type).toBe("primary_key");
    expect(schema.name).toBe("orders_pkey");
    if (schema.type === "primary_key") {
      expect(schema.columns).toEqual(["id"]);
    }
  });
});

describe("ConstraintBuilder › check", () => {
  it("captures the condition", () => {
    const schema = constrainBuilder("age_check").check("age > 0").toSchema();
    expect(schema.type).toBe("check");
    if (schema.type === "check") {
      expect(schema.condition).toBe("age > 0");
    }
  });
});

describe("ConstraintBuilder › exclude", () => {
  it("captures expressions and the default gist index type", () => {
    const schema = constrainBuilder("room_excl")
      .exclude([{ column: "during", operator: "&&" }])
      .toSchema() as ExcludeConstraint;
    expect(schema.type).toBe("exclude");
    expect(schema.expressions).toEqual([{ column: "during", operator: "&&" }]);
    expect(schema.indexType).toBe("gist");
  });

  it("indexType() overrides the default index type", () => {
    const schema = constrainBuilder("room_excl")
      .exclude([{ column: "during", operator: "&&" }])
      .indexType("spgist")
      .toSchema() as ExcludeConstraint;
    expect(schema.indexType).toBe("spgist");
  });
});

describe("ConstraintBuilder › optional clauses", () => {
  it("where() attaches a partial constraint predicate", () => {
    const schema = constrainBuilder("u").columns(["email"]).unique().where("deleted_at IS NULL").toSchema();
    expect(schema.where).toBe("deleted_at IS NULL");
  });

  it("deferrable() defaults initiallyDeferred to false", () => {
    const schema = constrainBuilder("u").columns(["email"]).unique().deferrable().toSchema();
    expect(schema.deferrable).toBe(true);
    expect(schema.initiallyDeferred).toBe(false);
  });

  it("deferrable(true) sets initiallyDeferred true", () => {
    const schema = constrainBuilder("u").columns(["email"]).unique().deferrable(true).toSchema();
    expect(schema.deferrable).toBe(true);
    expect(schema.initiallyDeferred).toBe(true);
  });
});

describe("ConstraintBuilder › validation and auto-naming", () => {
  it("throws when no constraint type was declared", () => {
    expect(() => constrainBuilder("x").columns(["a"]).toSchema()).toThrow(
      /constraint type must be declared/,
    );
  });

  it("derives a name from type and columns when none is given", () => {
    // An empty name triggers auto-generation from type + columns.
    const schema = constrainBuilder("").columns(["a", "b"]).unique().toSchema();
    expect(schema.name).toBe("unique_a_b");
  });
});
