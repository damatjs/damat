import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateZodFile } from "../generator/generateZodFile";

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
    expect(content).toContain("export const userQuerySchema = z.object({");
    expect(content).toContain(
      "limit: z.coerce.number().int().positive().optional(),",
    );
    expect(content).toContain(
      "offset: z.coerce.number().int().min(0).optional(),",
    );
  });

  it("generates id schema", () => {
    const content = generateZodFile(schema.tables[0]!, schema, null);
    expect(content).toContain("export const userIdSchema = z.string().uuid();");
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
      "export type UserQuery = z.infer<typeof userQuerySchema>;",
    );
    expect(content).toContain(
      "export type UserId = z.infer<typeof userIdSchema>;",
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
