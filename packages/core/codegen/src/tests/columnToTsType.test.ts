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

describe("columnToTsType › primitive base mappings", () => {
  it("maps integer-family types to number", () => {
    for (const t of ["smallint", "integer", "smallserial", "serial"] as const) {
      expect(columnToTsType(col(t))).toBe("number");
    }
  });

  it("maps bigint / bigserial to bigint", () => {
    expect(columnToTsType(col("bigint"))).toBe("bigint");
    expect(columnToTsType(col("bigserial"))).toBe("bigint");
  });

  it("maps floating point and exact numeric to number", () => {
    for (const t of [
      "real",
      "double precision",
      "numeric",
      "decimal",
    ] as const) {
      expect(columnToTsType(col(t))).toBe("number");
    }
  });

  it("maps money to string", () => {
    expect(columnToTsType(col("money"))).toBe("string");
  });

  it("maps character types to string", () => {
    for (const t of ["text", "character", "character varying"] as const) {
      expect(columnToTsType(col(t))).toBe("string");
    }
  });

  it("maps bytea to Buffer", () => {
    expect(columnToTsType(col("bytea"))).toBe("Buffer");
  });

  it("maps timestamp / date types to Date", () => {
    for (const t of [
      "timestamp without time zone",
      "timestamp with time zone",
      "date",
    ] as const) {
      expect(columnToTsType(col(t))).toBe("Date");
    }
  });

  it("maps time types to string", () => {
    expect(columnToTsType(col("time without time zone"))).toBe("string");
    expect(columnToTsType(col("time with time zone"))).toBe("string");
  });

  it("maps boolean to boolean", () => {
    expect(columnToTsType(col("boolean"))).toBe("boolean");
  });

  it("maps json / jsonb to unknown", () => {
    expect(columnToTsType(col("json"))).toBe("unknown");
    expect(columnToTsType(col("jsonb"))).toBe("unknown");
  });

  it("maps uuid, xml and bit strings to string", () => {
    for (const t of [
      "uuid",
      "xml",
      "bit",
      "bit varying",
      "jsonpath",
    ] as const) {
      expect(columnToTsType(col(t))).toBe("string");
    }
  });

  it("maps network address types to string", () => {
    for (const t of ["cidr", "inet", "macaddr", "macaddr8"] as const) {
      expect(columnToTsType(col(t))).toBe("string");
    }
  });

  it("maps oid to number and pg_lsn / pg_snapshot to string", () => {
    expect(columnToTsType(col("oid"))).toBe("number");
    expect(columnToTsType(col("pg_lsn"))).toBe("string");
    expect(columnToTsType(col("pg_snapshot"))).toBe("string");
  });
});

describe("columnToTsType › structured object base mappings", () => {
  it("maps point to its inline object literal", () => {
    expect(columnToTsType(col("point"))).toBe("{ x: number; y: number }");
  });

  it("maps lseg and box to the four-coordinate shape", () => {
    const shape = "{ x1: number; y1: number; x2: number; y2: number }";
    expect(columnToTsType(col("lseg"))).toBe(shape);
    expect(columnToTsType(col("box"))).toBe(shape);
  });

  it("maps circle to centre-plus-radius shape", () => {
    expect(columnToTsType(col("circle"))).toBe(
      "{ x: number; y: number; radius: number }",
    );
  });

  it("maps line / path / polygon to string", () => {
    for (const t of ["line", "path", "polygon"] as const) {
      expect(columnToTsType(col(t))).toBe("string");
    }
  });

  it("maps interval to a structured object", () => {
    expect(columnToTsType(col("interval"))).toBe(
      "{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }",
    );
  });

  it("maps int4range / numrange to number-bounded range objects", () => {
    const shape =
      "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";
    expect(columnToTsType(col("int4range"))).toBe(shape);
    expect(columnToTsType(col("numrange"))).toBe(shape);
  });

  it("maps int8range to a bigint-bounded range object", () => {
    expect(columnToTsType(col("int8range"))).toBe(
      "{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }",
    );
  });

  it("maps date/timestamp ranges to Date-bounded range objects", () => {
    const shape =
      "{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";
    for (const t of ["tsrange", "tstzrange", "daterange"] as const) {
      expect(columnToTsType(col(t))).toBe(shape);
    }
  });

  it("maps multirange types to arrays of their range object", () => {
    expect(columnToTsType(col("int4multirange"))).toBe(
      "Array<{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>",
    );
    expect(columnToTsType(col("int8multirange"))).toBe(
      "Array<{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>",
    );
    expect(columnToTsType(col("tsmultirange"))).toBe(
      "Array<{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>",
    );
  });
});

describe("columnToTsType › nullability", () => {
  it("appends ` | null` for nullable primitives", () => {
    expect(columnToTsType(col("text", { nullable: true }))).toBe(
      "string | null",
    );
    expect(columnToTsType(col("integer", { nullable: true }))).toBe(
      "number | null",
    );
    expect(columnToTsType(col("boolean", { nullable: true }))).toBe(
      "boolean | null",
    );
  });

  it("appends ` | null` after a structured object without adding parens", () => {
    // The object's internal ` | ` unions live inside braces (depth > 0), so
    // the needsParens guard does not fire and no extra parens are emitted.
    expect(columnToTsType(col("point", { nullable: true }))).toBe(
      "{ x: number; y: number } | null",
    );
    expect(columnToTsType(col("int4range", { nullable: true }))).toBe(
      "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean } | null",
    );
  });

  it("does not append ` | null` for non-nullable columns", () => {
    expect(columnToTsType(col("text"))).toBe("string");
    expect(columnToTsType(col("text"))).not.toContain("null");
  });
});

describe("columnToTsType › arrays", () => {
  it("wraps a non-nullable array base in Array<...>", () => {
    expect(columnToTsType(col("text", { array: true }))).toBe("Array<string>");
    expect(columnToTsType(col("integer", { array: true }))).toBe(
      "Array<number>",
    );
  });

  it("wraps then nullifies a nullable array", () => {
    expect(
      columnToTsType(col("integer", { array: true, nullable: true })),
    ).toBe("Array<number> | null");
  });

  it("wraps structured object arrays", () => {
    expect(columnToTsType(col("point", { array: true }))).toBe(
      "Array<{ x: number; y: number }>",
    );
    expect(columnToTsType(col("point", { array: true, nullable: true }))).toBe(
      "Array<{ x: number; y: number }> | null",
    );
  });
});

describe("columnToTsType › enums", () => {
  it("resolves a named enum to its PascalCase + Enum-suffixed alias", () => {
    expect(columnToTsType(col("enum", { enum: "status_type" }))).toBe(
      "StatusTypeEnum",
    );
  });

  it("supports nullable named enums", () => {
    expect(
      columnToTsType(col("enum", { enum: "status_type", nullable: true })),
    ).toBe("StatusTypeEnum | null");
  });

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

  it("falls back to the base 'string' type for an enum column with no enum name", () => {
    // No `enum` property → not a named enum, so pgTypeToTsBase('enum') = 'string'.
    expect(columnToTsType(col("enum"))).toBe("string");
    expect(columnToTsType(col("enum", { nullable: true }))).toBe(
      "string | null",
    );
  });
});

describe("columnToTsType › default does not affect type", () => {
  it("ignores the default value when computing the TS type", () => {
    expect(columnToTsType(col("text", { default: "x" }))).toBe("string");
    expect(columnToTsType(col("integer", { default: 0 }))).toBe("number");
  });
});
