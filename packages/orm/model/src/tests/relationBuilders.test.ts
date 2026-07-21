import { describe, it, expect } from "bun:test";
import { belongsTo } from "@/properties/relation/belongsToBuilder";
import { hasMany } from "@/properties/relation/hasManyBuilder";
import { hasOne } from "@/properties/relation/hasOneBuilder";
import { formatViolations } from "@/properties/relation/validate/format";
import type { RelationViolation } from "@/properties/relation/validate/types";
import { CategorySchema } from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// BelongsTo fluent constraint helpers + getters
// ─────────────────────────────────────────────────────────────────────────────

describe("BelongsTo › constraint() one-shot setter", () => {
  it("applies every constraint option", () => {
    const rel = belongsTo(CategorySchema).constraint({
      name: "fk_custom",
      onDelete: "CASCADE",
      onUpdate: "RESTRICT",
      deferrable: true,
      initiallyDeferred: true,
      match: "FULL",
    });
    const fk = rel.toForeignKeySchema();
    expect(fk.name).toBe("fk_custom");
    expect(fk.onDelete).toBe("CASCADE");
    expect(fk.onUpdate).toBe("RESTRICT");
    expect(fk.deferrable).toBe(true);
    expect(fk.initiallyDeferred).toBe(true);
    expect(fk.match).toBe("FULL");
  });
});

describe("BelongsTo › match() / deferrable() fluent setters", () => {
  it("match() sets the FK match clause", () => {
    const fk = belongsTo(CategorySchema).match("PARTIAL").toForeignKeySchema();
    expect(fk.match).toBe("PARTIAL");
  });

  it("deferrable() defaults initiallyDeferred to false", () => {
    const fk = belongsTo(CategorySchema).deferrable().toForeignKeySchema();
    expect(fk.deferrable).toBe(true);
    expect(fk.initiallyDeferred).toBeUndefined();
  });

  it("deferrable(true) marks initiallyDeferred", () => {
    const fk = belongsTo(CategorySchema).deferrable(true).toForeignKeySchema();
    expect(fk.deferrable).toBe(true);
    expect(fk.initiallyDeferred).toBe(true);
  });
});

describe("BelongsTo › getters", () => {
  it("createsForeignKey() is true", () => {
    expect(belongsTo(CategorySchema).createsForeignKey()).toBe(true);
  });

  it("isNullable() reflects nullable()", () => {
    expect(belongsTo(CategorySchema).isNullable()).toBe(false);
    expect(belongsTo(CategorySchema).nullable().isNullable()).toBe(true);
  });

  it("isUnique() reflects unique()", () => {
    expect(belongsTo(CategorySchema).isUnique()).toBe(false);
    expect(belongsTo(CategorySchema).unique().isUnique()).toBe(true);
  });
});

describe("HasOne › getters", () => {
  it("createsForeignKey() is false", () => {
    expect(hasOne(CategorySchema).createsForeignKey()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HasMany getters / toTsType
// ─────────────────────────────────────────────────────────────────────────────

describe("HasMany › getters and toTsType", () => {
  it("createsForeignKey() is false", () => {
    expect(hasMany(CategorySchema).createsForeignKey()).toBe(false);
  });

  it("toTsType wraps a string target in Array<Pascal>", () => {
    expect(hasMany("blog_post").toTsType()).toBe("Array<BlogPost>");
  });

  it("toTsType wraps a model target's interface in Array<...>", () => {
    const ts = hasMany(CategorySchema).toTsType();
    expect(ts.startsWith("Array<export interface")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatViolations — every violation kind renders
// ─────────────────────────────────────────────────────────────────────────────

function violation(overrides: Partial<RelationViolation>): RelationViolation {
  return {
    kind: "missing_inverse",
    sourceTable: "order_item",
    sourceProp: "order",
    sourceType: "belongsTo",
    targetTable: "order",
    targetProp: "items",
    ...overrides,
  };
}

describe("formatViolations", () => {
  it("renders missing_inverse with a hasMany/hasOne fix suggestion", () => {
    const out = formatViolations([violation({ kind: "missing_inverse" })]);
    expect(out).toContain("Found 1 relation violation:");
    expect(out).toContain("hasMany(order_itemSchema)");
  });

  it("renders missing_belongsTo with a belongsTo fix suggestion", () => {
    const out = formatViolations([
      violation({ kind: "missing_belongsTo", sourceType: "hasMany" }),
    ]);
    expect(out).toContain("belongsTo(order_itemSchema)");
  });

  it("renders wrong_type with the found type and expected fix", () => {
    const out = formatViolations([
      violation({
        kind: "wrong_type",
        sourceType: "belongsTo",
        foundType: "column",
      }),
    ]);
    expect(out).toContain("found: column");
    expect(out).toContain("hasMany(...) or hasOne(...)");
  });

  it("renders wrong_type expecting belongsTo when source is hasMany", () => {
    const out = formatViolations([
      violation({
        kind: "wrong_type",
        sourceType: "hasMany",
        foundType: undefined,
      }),
    ]);
    expect(out).toContain("found: unknown");
    expect(out).toContain("belongsTo(...)");
  });

  it("renders mappedBy_mismatch describing both sides", () => {
    const out = formatViolations([violation({ kind: "mappedBy_mismatch" })]);
    expect(out).toContain("Both sides of the relation exist:");
    expect(out).toContain("mappedBy");
  });

  it("uses the plural header for multiple violations", () => {
    const out = formatViolations([
      violation({ kind: "missing_inverse" }),
      violation({ kind: "mappedBy_mismatch" }),
    ]);
    expect(out).toContain("Found 2 relation violations:");
  });
});
