import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { getRelationImports } from "../generator/helpers";

describe("getRelationImports", () => {
  it("returns an empty array when the schema has no relationships field", () => {
    const bare: ModuleSchema = { moduleName: "bare", tables: [] };
    expect(getRelationImports("post", bare)).toEqual([]);
  });
});
