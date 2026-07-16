import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateEnumTypes } from "../render/enums";

describe("generateEnumTypes", () => {
  it("returns empty array for no enums", () => {
    const emptySchema: ModuleSchema = { moduleName: "test", tables: [] };
    expect(generateEnumTypes(emptySchema)).toEqual([]);
  });
});
