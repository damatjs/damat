import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateZodTypes } from "../generator/generateZodTypes";

describe("generateZodTypes (single-file orchestration)", () => {
  const schema: ModuleSchema = {
    moduleName: "blog",
    tables: [
      {
        name: "user",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "email", type: "text", nullable: false },
        ],
      },
      {
        name: "post",
        columns: [
          { name: "id", type: "integer", nullable: false, primaryKey: true },
          { name: "title", type: "text", nullable: false },
        ],
      },
    ],
    enums: [{ name: "role", values: ["admin", "user"] }],
  };

  it("includes the default banner and respects banner: false", () => {
    expect(generateZodTypes(schema)).toContain(
      "// This file is auto-generated",
    );
    expect(generateZodTypes(schema, { banner: false })).not.toContain(
      "auto-generated",
    );
  });
});
