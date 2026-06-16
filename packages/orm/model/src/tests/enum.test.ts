import { describe, it, expect } from "bun:test";
import { EnumBuilder } from "@/properties/enum/base";

// ─────────────────────────────────────────────────────────────────────────────
// EnumBuilder — declares a named PG enum + emits the matching TS union/alias
// ─────────────────────────────────────────────────────────────────────────────

describe("EnumBuilder › toSchema", () => {
  it("serialises name and values in declaration order", () => {
    const e = new EnumBuilder(["draft", "active", "archived"]).name(
      "product_status",
    );
    expect(e.toSchema()).toEqual({
      name: "product_status",
      values: ["draft", "active", "archived"],
    });
  });

  it("preserves duplicate / single values verbatim (no dedupe)", () => {
    const e = new EnumBuilder(["a", "a", "b"]).name("dups");
    expect(e.toSchema().values).toEqual(["a", "a", "b"]);
  });

  it("name defaults to empty string when never set", () => {
    const e = new EnumBuilder(["x"]);
    expect(e.toSchema().name).toBe("");
  });
});

describe("EnumBuilder › fluent name()", () => {
  it("returns this for chaining and stores the last name set", () => {
    const e = new EnumBuilder(["x"]);
    expect(e.name("first")).toBe(e);
    e.name("second");
    expect(e.toSchema().name).toBe("second");
    expect(e.toTsTypeName()).toBe("second");
  });
});

describe("EnumBuilder › toTsTypeDeclaration", () => {
  it("emits an exported type alias of the string-literal union", () => {
    const e = new EnumBuilder(["pending", "shipped"]).name("orders");
    expect(e.toTsTypeDeclaration()).toBe(
      "export type orders = 'pending' | 'shipped';",
    );
  });

  it("a single value yields a single-literal alias (no pipe)", () => {
    const e = new EnumBuilder(["solo"]).name("mono");
    expect(e.toTsTypeDeclaration()).toBe("export type mono = 'solo';");
  });

  it("empty value list degrades to the string type", () => {
    const e = new EnumBuilder([]).name("empty");
    expect(e.toTsTypeDeclaration()).toBe("export type empty = string;");
  });
});

describe("EnumBuilder › toTsTypeName", () => {
  it("returns the bare name (used as a reference, not the expanded union)", () => {
    const e = new EnumBuilder(["a", "b"]).name("Status");
    expect(e.toTsTypeName()).toBe("Status");
  });
});
