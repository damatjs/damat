import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateQueryZodSchema } from "../render/zod";

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
