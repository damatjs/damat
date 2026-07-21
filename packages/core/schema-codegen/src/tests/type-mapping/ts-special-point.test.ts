import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToTsType } from "../../columnToTsType";
import { describe, it, expect } from "bun:test";

{
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

  describe("columnToTsType › structured object base mappings", () => {
    it("maps point to its inline object literal", () => {
      expect(columnToTsType(col("point"))).toBe("{ x: number; y: number }");
    });
  });
}
