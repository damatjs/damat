import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateZodFile } from "../generator/generateZodFile";
import { generateZodTypes } from "../generator/generateTypes";
import {
  generateNewZodSchema,
  generateUpdateZodSchema,
  generateQueryZodSchema,
  generateIdZodSchema,
} from "../utils/zodSchemas";

describe("generateZodFile", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "user",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "email", type: "text", nullable: false },
          { name: "name", type: "text", nullable: false },
          { name: "age", type: "integer", nullable: true },
          {
            name: "verified",
            type: "boolean",
            nullable: false,
            default: false,
          },
        ],
      },
    ],
    enums: [],
  };

  it("generates zod import", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain('import { z } from "@damatjs/deps/zod"');
  });

  it("generates new schema", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("export const newUserSchema = z.object({");
    expect(content).toContain("email: z.string(),");
    expect(content).toContain("name: z.string(),");
    expect(content).toContain("age: z.number().int().nullable().optional(),");
    expect(content).toContain("verified: z.boolean().optional(),");
  });

  it("generates update schema", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("export const updateUserSchema = z.object({");
  });

  it("generates query schema with pagination", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    // NOTE: the query const name is derived as `${toCamelCase(toPascalCase(
    // table.name))}QuerySchema`. `toCamelCase` only lowercases letters after
    // an underscore, so for a single-word table like "user" the already-
    // PascalCased "User" passes through unchanged → "UserQuerySchema".
    expect(content).toContain("export const UserQuerySchema = z.object({");
    expect(content).toContain(
      "limit: z.coerce.number().int().positive().optional(),",
    );
    expect(content).toContain(
      "offset: z.coerce.number().int().min(0).optional(),",
    );
    expect(content).toContain("orderBy: z.string().optional(),");
    expect(content).toContain("orderDir: z.enum(['asc', 'desc']).optional(),");
  });

  it("coerces query params for numeric and boolean columns", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    // Inside the query schema, integers/booleans become coercing validators.
    expect(content).toContain(
      "age: z.coerce.number().int().nullable().optional(),",
    );
    expect(content).toContain("verified: z.coerce.boolean().optional(),");
  });

  it("generates id schema", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    // Same camelCase quirk as the query schema → "UserIdSchema".
    expect(content).toContain("export const UserIdSchema = z.string().uuid();");
  });

  it("generates params schema for the [id] route, keyed by id with the pk type", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("export const UserParamsSchema = z.object({");
    expect(content).toContain("  id: z.string().uuid(),");
    expect(content).toContain("}).strict();");
  });

  it("generates type exports", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain(
      "export type NewUserInput = z.infer<typeof newUserSchema>;",
    );
    expect(content).toContain(
      "export type UpdateUserInput = z.infer<typeof updateUserSchema>;",
    );
    expect(content).toContain(
      "export type UserQuery = z.infer<typeof UserQuerySchema>;",
    );
    expect(content).toContain(
      "export type UserId = z.infer<typeof UserIdSchema>;",
    );
    expect(content).toContain(
      "export type UserParams = z.infer<typeof UserParamsSchema>;",
    );
  });

  it("handles uuid columns", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("z.string().uuid()");
  });

  it("handles integer columns", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("z.number().int()");
  });

  it("handles boolean columns", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("z.boolean()");
  });

  it("handles date/timestamp columns", () => {
    const dateSchema: ModuleSchema = {
      moduleName: "test",
      tables: [
        {
          name: "event",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "event_date", type: "date", nullable: false },
          ],
        },
      ],
      enums: [],
    };
    const content = generateZodFile(dateSchema.tables[0]!, dateSchema, null);
    expect(content).toContain("event_date: z.coerce.date()");
  });
});

describe("generateZodFile with enums", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "product",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "name", type: "text", nullable: false },
          {
            name: "status",
            type: "enum",
            enum: "product_status",
            nullable: false,
          },
        ],
      },
    ],
    enums: [
      { name: "product_status", values: ["draft", "active", "archived"] },
    ],
  };

  it("generates enum import", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain(
      'import type { ProductStatusEnum } from "./enums"',
    );
  });

  it("generates enum schema", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("z.enum(['draft', 'active', 'archived'])");
  });
});

describe("generateZodFile with timestamps", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "order",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "total", type: "numeric", nullable: false },
          {
            name: "created_at",
            type: "timestamp with time zone",
            nullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            nullable: true,
          },
          {
            name: "deleted_at",
            type: "timestamp with time zone",
            nullable: true,
          },
        ],
      },
    ],
    enums: [],
  };

  it("excludes timestamp columns from schemas", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    // These should NOT appear in the new schema
    const newSchemaMatch = content.match(
      /export const newOrderSchema = z\.object\(\{[\s\S]*?\}\)\.strict\(\);/,
    );
    expect(newSchemaMatch).toBeDefined();
    expect(newSchemaMatch![0]).not.toContain("created_at");
    expect(newSchemaMatch![0]).not.toContain("updated_at");
    expect(newSchemaMatch![0]).not.toContain("deleted_at");
  });
});

describe("generateZodFile › banner", () => {
  const schema: ModuleSchema = {
    moduleName: "store",
    tables: [
      {
        name: "tag",
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "label", type: "text", nullable: false },
        ],
      },
    ],
    enums: [],
  };

  it("prepends the banner when provided", () => {
    const content = generateZodFile(schema.tables[0]!, schema, "// banner\n");
    expect(content.startsWith("// banner")).toBe(true);
    expect(content).toContain('import { z } from "@damatjs/deps/zod"');
  });

  it("starts with the import when banner is null", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content.startsWith("import { z }")).toBe(true);
  });
});

describe("generateNewZodSchema", () => {
  const allEnums = [{ name: "role", values: ["admin", "member"] }];

  it("requires plain columns, makes defaults optional, nullables nullable+optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "user",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "email", type: "text", nullable: false },
        { name: "role", type: "text", nullable: false, default: "member" },
        { name: "bio", type: "text", nullable: true },
      ],
    };
    const lines = generateNewZodSchema(table, new Set(["id"]), allEnums);
    expect(lines).toContain("  email: z.string(),");
    expect(lines).toContain("  role: z.string().optional(),");
    expect(lines).toContain("  bio: z.string().nullable().optional(),");
    // auto field omitted
    expect(lines.some((l) => l.trimStart().startsWith("id:"))).toBe(false);
  });

  it("skips created_at / updated_at / deleted_at columns by name", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "row",
      columns: [
        { name: "value", type: "text", nullable: false },
        { name: "created_at", type: "date", nullable: false },
        { name: "updated_at", type: "date", nullable: true },
        { name: "deleted_at", type: "date", nullable: true },
      ],
    };
    const lines = generateNewZodSchema(table, new Set(), []);
    const body = lines.join("\n");
    expect(body).toContain("value: z.string(),");
    expect(body).not.toContain("created_at");
    expect(body).not.toContain("updated_at");
    expect(body).not.toContain("deleted_at");
  });

  it("expands a named enum into z.enum([...]) with its literal values", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "account",
      columns: [{ name: "role", type: "enum", enum: "role", nullable: false }],
    };
    const lines = generateNewZodSchema(table, new Set(), allEnums);
    expect(lines).toContain("  role: z.enum(['admin', 'member']),");
  });

  it("falls back to z.string() for an enum with no matching enum schema", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "account",
      columns: [
        { name: "role", type: "enum", enum: "missing", nullable: false },
      ],
    };
    const lines = generateNewZodSchema(table, new Set(), allEnums);
    expect(lines).toContain("  role: z.string(),");
  });
});

describe("generateUpdateZodSchema", () => {
  it("omits primary keys and id and makes every other field optional", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "item",
      columns: [
        { name: "id", type: "integer", nullable: false, primaryKey: true },
        { name: "label", type: "text", nullable: false },
        { name: "note", type: "text", nullable: true },
      ],
    };
    const lines = generateUpdateZodSchema(table, []);
    expect(lines).toContain("export const updateItemSchema = z.object({");
    expect(lines).toContain("  label: z.string().optional(),");
    expect(lines).toContain("  note: z.string().nullable().optional(),");
    expect(lines.some((l) => l.includes("id:"))).toBe(false);
  });
});

describe("generateQueryZodSchema", () => {
  it("includes pagination + ordering fields and coerces numeric/boolean columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "metric",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "count", type: "integer", nullable: false },
        { name: "active", type: "boolean", nullable: false },
        { name: "big", type: "bigint", nullable: true },
      ],
    };
    const lines = generateQueryZodSchema(table, []);
    const body = lines.join("\n");
    expect(body).toContain("count: z.coerce.number().int().optional(),");
    expect(body).toContain("active: z.coerce.boolean().optional(),");
    expect(body).toContain("big: z.coerce.bigint().nullable().optional(),");
    expect(body).toContain(
      "limit: z.coerce.number().int().positive().optional(),",
    );
    expect(body).toContain(
      "offset: z.coerce.number().int().min(0).optional(),",
    );
    expect(body).toContain("orderBy: z.string().optional(),");
    expect(body).toContain("orderDir: z.enum(['asc', 'desc']).optional(),");
  });
});

describe("generateIdZodSchema", () => {
  it("uses z.string().uuid() for a uuid PK", () => {
    const lines = generateIdZodSchema({
      name: "user",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
      ],
    });
    expect(lines).toContain("export const UserIdSchema = z.string().uuid();");
    expect(lines).toContain(
      "export type UserId = z.infer<typeof UserIdSchema>;",
    );
  });

  it("uses a coerced positive int for integer / serial PK", () => {
    for (const t of ["integer", "serial"] as const) {
      const lines = generateIdZodSchema({
        name: "item",
        columns: [{ name: "id", type: t, nullable: false, primaryKey: true }],
      });
      expect(lines).toContain(
        "export const ItemIdSchema = z.coerce.number().int().positive();",
      );
    }
  });

  it("uses a coerced bigint for bigint / bigserial PK", () => {
    const lines = generateIdZodSchema({
      name: "big",
      columns: [
        { name: "id", type: "bigserial", nullable: false, primaryKey: true },
      ],
    });
    expect(lines).toContain("export const BigIdSchema = z.coerce.bigint();");
  });

  it("falls back to z.string() for a non-numeric, non-uuid PK", () => {
    const lines = generateIdZodSchema({
      name: "code",
      columns: [
        { name: "value", type: "text", nullable: false, primaryKey: true },
      ],
    });
    expect(lines).toContain("export const CodeIdSchema = z.string();");
  });

  it("returns an empty array when the table has no primary key", () => {
    const lines = generateIdZodSchema({
      name: "np",
      columns: [{ name: "k", type: "text", nullable: false }],
    });
    expect(lines).toEqual([]);
  });
});

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
    expect(out.startsWith('import { z } from "@damatjs/deps/zod";')).toBe(true);
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

  it("includes the default banner and respects banner: false", () => {
    expect(generateZodTypes(schema)).toContain(
      "// This file is auto-generated",
    );
    expect(generateZodTypes(schema, { banner: false })).not.toContain(
      "auto-generated",
    );
  });

  it("derives the id PK type per table (uuid vs serial)", () => {
    const out = generateZodTypes(schema, { banner: false });
    expect(out).toContain("export const UserIdSchema = z.string().uuid();");
    expect(out).toContain(
      "export const PostIdSchema = z.coerce.number().int().positive();",
    );
  });
});
