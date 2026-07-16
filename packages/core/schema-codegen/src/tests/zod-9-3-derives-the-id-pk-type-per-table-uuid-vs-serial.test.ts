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

  it("derives the id PK type per table (uuid vs serial)", () => {
    const out = generateZodTypes(schema, { banner: false });
    expect(out).toContain("export const UserIdSchema = z.string().uuid();");
    expect(out).toContain(
      "export const PostIdSchema = z.coerce.number().int().positive();",
    );
  });
});
