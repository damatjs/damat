import { describe, it, expect } from "bun:test";
import { ColumnType } from "@damatjs/orm-type";
import { pgTypeToTsBase } from "../type-mapping/ts";

describe("pgTypeToTsBase › unmatched", () => {
  it("returns undefined for a type not covered by the switch", () => {
    // The switch intentionally has no default branch.
    expect(pgTypeToTsBase("not_a_real_type" as ColumnType)).toBeUndefined();
  });
});
