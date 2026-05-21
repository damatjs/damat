import { describe, it, expect } from "bun:test";
import { columnToTsType } from "../columnToTsType";

describe("columnToTsType", () => {
  it("converts basic types correctly", () => {
    expect(columnToTsType({ name: "id", type: "uuid", nullable: false, array: false })).toBe("string");
    expect(columnToTsType({ name: "count", type: "integer", nullable: false, array: false })).toBe("number");
    expect(columnToTsType({ name: "active", type: "boolean", nullable: false, array: false })).toBe("boolean");
    expect(columnToTsType({ name: "data", type: "jsonb", nullable: false, array: false })).toBe("unknown");
  });

  it("handles nullable columns", () => {
    expect(columnToTsType({ name: "name", type: "text", nullable: true, array: false })).toBe("string | null");
    expect(columnToTsType({ name: "age", type: "integer", nullable: true, array: false })).toBe("number | null");
  });

  it("handles array types", () => {
    expect(columnToTsType({ name: "tags", type: "text", nullable: false, array: true })).toBe("Array<string>");
    expect(columnToTsType({ name: "nums", type: "integer", nullable: true, array: true })).toBe("Array<number> | null");
  });

  it("handles enum types", () => {
    expect(columnToTsType({ name: "status", type: "enum", enum: "status_type", nullable: false, array: false })).toBe("StatusTypeEnum");
    expect(columnToTsType({ name: "status", type: "enum", enum: "status_type", nullable: true, array: false })).toBe("StatusTypeEnum | null");
  });

  it("handles nullable enum arrays", () => {
    expect(columnToTsType({ name: "statuses", type: "enum", enum: "status_type", nullable: false, array: true })).toBe("Array<StatusTypeEnum>");
    expect(columnToTsType({ name: "statuses", type: "enum", enum: "status_type", nullable: true, array: true })).toBe("Array<StatusTypeEnum> | null");
  });
});
