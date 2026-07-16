import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes › relations and edge cases", () => {
  it("emits no enum block or relation comment for a bare module", () => {
    const schema: ModuleSchema = {
      moduleName: "bare",
      tables: [
        {
          name: "category",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
    };
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("export interface Category {");
    // New*/Update* types are always emitted, but no enum alias should be.
    expect(out).not.toMatch(/export type \w+Enum =/);
    expect(out).not.toContain("// loaded relations");
    expect(out).not.toMatch(/=\s*'/); // no enum union literal anywhere
  });
});
