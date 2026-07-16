import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateEnumsFile } from "../render/enums";

describe("generateEnumsFile", () => {
  it("returns null when no enums", () => {
    const emptySchema: ModuleSchema = { moduleName: "test", tables: [] };
    expect(generateEnumsFile(emptySchema, null)).toBe(null);
  });
});
