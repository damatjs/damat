import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateEnumTypes, generateEnumsFile, getTableEnums } from "../../utils/enum";

describe("generateEnumTypes", () => {
  it("generates enum type lines", () => {
    const schema: ModuleSchema = {
      moduleName: "test",
      tables: [],
      enums: [
        { name: "status", values: ["draft", "published", "archived"] },
        { name: "role", values: ["admin", "user"] },
      ],
    };

    const lines = generateEnumTypes(schema);
    expect(lines).toContain("export type StatusEnum = 'draft' | 'published' | 'archived';");
    expect(lines).toContain("export type RoleEnum = 'admin' | 'user';");
  });

  it("returns empty array for no enums", () => {
    const emptySchema: ModuleSchema = { moduleName: "test", tables: [] };
    expect(generateEnumTypes(emptySchema)).toEqual([]);
  });

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

describe("generateEnumsFile", () => {
  const schema: ModuleSchema = {
    moduleName: "test",
    tables: [],
    enums: [
      { name: "status", values: ["draft", "published", "archived"] },
      { name: "role", values: ["admin", "user"] },
    ],
  };

  it("generates file content with banner", () => {
    const content = generateEnumsFile(schema, "// test banner\n");
    expect(content).toContain("// test banner");
    expect(content).toContain("export type StatusEnum");
  });

  it("generates file content without banner", () => {
    const content = generateEnumsFile(schema, null);
    expect(content).toContain("export type StatusEnum");
    expect(content?.startsWith("export")).toBe(true);
  });

  it("returns null when no enums", () => {
    const emptySchema: ModuleSchema = { moduleName: "test", tables: [] };
    expect(generateEnumsFile(emptySchema, null)).toBe(null);
  });
});

describe("getTableEnums", () => {
  const schema: ModuleSchema = {
    moduleName: "test",
    tables: [],
    enums: [
      { name: "status", values: ["draft", "published"] },
      { name: "role", values: ["admin", "user"] },
      { name: "priority", values: ["low", "medium", "high"] },
    ],
  };

  it("returns enums used by table columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "product",
      columns: [
        { name: "status", type: "enum", enum: "status", nullable: false },
        { name: "name", type: "text", nullable: false },
      ],
    };

    const enums = getTableEnums(table, schema.enums!);
    expect(enums.length).toBe(1);
    expect(enums[0]!.name).toBe("status");
  });

  it("returns multiple enums used by table", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "task",
      columns: [
        { name: "status", type: "enum", enum: "status", nullable: false },
        { name: "role", type: "enum", enum: "role", nullable: false },
        { name: "name", type: "text", nullable: false },
      ],
    };

    const enums = getTableEnums(table, schema.enums!);
    expect(enums.length).toBe(2);
    expect(enums.map((e) => e.name)).toContain("status");
    expect(enums.map((e) => e.name)).toContain("role");
  });

  it("returns empty array when no enum columns", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "simple",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "name", type: "text", nullable: false },
      ],
    };

    expect(getTableEnums(table, schema.enums!)).toEqual([]);
  });

  it("handles duplicate enum references", () => {
    const table: ModuleSchema["tables"][number] = {
      name: "complex",
      columns: [
        { name: "status1", type: "enum", enum: "status", nullable: false },
        { name: "status2", type: "enum", enum: "status", nullable: false },
      ],
    };

    const enums = getTableEnums(table, schema.enums!);
    expect(enums.length).toBe(1);
    expect(enums[0]!.name).toBe("status");
  });
});
