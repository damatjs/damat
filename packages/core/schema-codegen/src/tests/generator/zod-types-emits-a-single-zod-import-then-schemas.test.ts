import { ModuleSchema } from "@damatjs/orm-type";
import { describe, it, expect } from "bun:test";
import { generateZodTypes } from "../../generator/generateZodTypes";

{
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

    it("emits a single zod import then schemas for every table", () => {
      const out = generateZodTypes(schema, { banner: false });
      // Exactly one import line at the top.
      expect(out.startsWith('import { z } from "@damatjs/deps/zod";')).toBe(
        true,
      );
      expect(out.match(/import \{ z \}/g)?.length).toBe(1);

      for (const name of [
        "newUserSchema",
        "updateUserSchema",
        "UserQuerySchema",
        "UserIdSchema",
      ]) {
        expect(out).toContain(`export const ${name} = `.trimEnd());
      }
      for (const name of [
        "newPostSchema",
        "updatePostSchema",
        "PostQuerySchema",
        "PostIdSchema",
      ]) {
        expect(out).toContain(`export const ${name}`);
      }
    });
  });
}

{
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
}
