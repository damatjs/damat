import { describe, it, expect } from "bun:test";
import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToTsType } from "../columnToTsType";

/** Helper to build a minimal ColumnSchema for a given type. */
const col = (
  type: ColumnType,
  extra: Partial<ColumnSchema> = {},
): ColumnSchema => ({
  name: "c",
  type,
  nullable: false,
  ...extra,
});

describe("columnToTsType › enums", () => {
  it("supports enum arrays (nullable and non-nullable)", () => {
    expect(
      columnToTsType(col("enum", { enum: "status_type", array: true })),
    ).toBe("Array<StatusTypeEnum>");
    expect(
      columnToTsType(
        col("enum", { enum: "status_type", array: true, nullable: true }),
      ),
    ).toBe("Array<StatusTypeEnum> | null");
  });
});
