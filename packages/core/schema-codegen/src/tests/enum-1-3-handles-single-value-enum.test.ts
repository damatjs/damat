import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateEnumTypes } from "../render/enums";

describe("generateEnumTypes", () => {
  it("handles single value enum", () => {
    const schema: ModuleSchema = {
      moduleName: "test",
      tables: [],
      enums: [{ name: "simple", values: ["only_one"] }],
    };

    const lines = generateEnumTypes(schema);
    expect(lines).toContain("export type SimpleEnum = 'only_one';");
  });
});
