import { describe, it, expect } from "bun:test";
import { ColumnSchema, ColumnType } from "@damatjs/orm-type";
import { columnToZodSchema } from "../columnToZodSchema";

const col = (
  type: ColumnType,
  extra: Partial<ColumnSchema> = {},
): ColumnSchema => ({
  name: "c",
  type,
  nullable: false,
  ...extra,
});

describe("columnToZodSchema › numeric types", () => {
  it("maps integer-family types to z.number().int()", () => {
    for (const t of [
      "smallint",
      "integer",
      "smallserial",
      "serial",
      "oid",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.number().int()");
    }
  });

  it("maps bigint / bigserial to z.bigint()", () => {
    expect(columnToZodSchema(col("bigint"))).toBe("z.bigint()");
    expect(columnToZodSchema(col("bigserial"))).toBe("z.bigint()");
  });

  it("maps floating point and exact numeric to z.number()", () => {
    for (const t of [
      "real",
      "double precision",
      "numeric",
      "decimal",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.number()");
    }
  });
});

describe("columnToZodSchema › character types", () => {
  it("maps character types to z.string()", () => {
    for (const t of [
      "text",
      "character",
      "character varying",
      "money",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.string()");
    }
  });

  it("adds .max() when a length is set on a character column", () => {
    expect(columnToZodSchema(col("text", { length: 255 }))).toBe(
      "z.string().max(255)",
    );
    expect(columnToZodSchema(col("character varying", { length: 10 }))).toBe(
      "z.string().max(10)",
    );
  });

  it("does not add .max() for non-character columns even with a length", () => {
    // length only influences character types
    expect(columnToZodSchema(col("integer", { length: 5 }))).toBe(
      "z.number().int()",
    );
  });
});

describe("columnToZodSchema › temporal types", () => {
  it("maps date / timestamp types to z.coerce.date()", () => {
    for (const t of [
      "timestamp without time zone",
      "timestamp with time zone",
      "date",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.coerce.date()");
    }
  });

  it("maps time types to z.string()", () => {
    expect(columnToZodSchema(col("time without time zone"))).toBe("z.string()");
    expect(columnToZodSchema(col("time with time zone"))).toBe("z.string()");
  });

  it("maps interval to a structured z.object", () => {
    expect(columnToZodSchema(col("interval"))).toBe(
      "z.object({ years: z.number(), months: z.number(), days: z.number(), hours: z.number(), minutes: z.number(), seconds: z.number(), milliseconds: z.number() })",
    );
  });
});

describe("columnToZodSchema › misc scalar types", () => {
  it("maps boolean to z.boolean()", () => {
    expect(columnToZodSchema(col("boolean"))).toBe("z.boolean()");
  });

  it("maps uuid to z.string().uuid()", () => {
    expect(columnToZodSchema(col("uuid"))).toBe("z.string().uuid()");
  });

  it("maps unknown-shaped types (bytea, json, jsonb) to z.unknown()", () => {
    for (const t of ["bytea", "json", "jsonb"] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.unknown()");
    }
  });

  it("maps string-ish types to z.string()", () => {
    for (const t of [
      "jsonpath",
      "xml",
      "bit",
      "bit varying",
      "cidr",
      "inet",
      "macaddr",
      "macaddr8",
      "tsvector",
      "tsquery",
      "line",
      "path",
      "polygon",
      "pg_lsn",
      "pg_snapshot",
    ] as const) {
      expect(columnToZodSchema(col(t))).toBe("z.string()");
    }
  });

  it("maps a bare enum column to z.string() (values handled elsewhere)", () => {
    expect(columnToZodSchema(col("enum"))).toBe("z.string()");
  });
});

describe("columnToZodSchema › geometric types", () => {
  it("maps point to z.object with x/y", () => {
    expect(columnToZodSchema(col("point"))).toBe(
      "z.object({ x: z.number(), y: z.number() })",
    );
  });

  it("maps lseg and box to the four-coordinate object", () => {
    const shape =
      "z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })";
    expect(columnToZodSchema(col("lseg"))).toBe(shape);
    expect(columnToZodSchema(col("box"))).toBe(shape);
  });

  it("maps circle to centre-plus-radius object", () => {
    expect(columnToZodSchema(col("circle"))).toBe(
      "z.object({ x: z.number(), y: z.number(), radius: z.number() })",
    );
  });
});

describe("columnToZodSchema › range and multirange types", () => {
  it("maps numeric ranges to a number-bounded z.object", () => {
    const shape =
      "z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";
    for (const t of ["int4range", "int8range", "numrange"] as const) {
      expect(columnToZodSchema(col(t))).toBe(shape);
    }
  });

  it("maps date ranges to a date-bounded z.object", () => {
    const shape =
      "z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";
    for (const t of ["tsrange", "tstzrange", "daterange"] as const) {
      expect(columnToZodSchema(col(t))).toBe(shape);
    }
  });

  it("maps numeric multiranges to z.array of the range object", () => {
    expect(columnToZodSchema(col("int4multirange"))).toBe(
      "z.array(z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))",
    );
  });

  it("maps date multiranges to z.array of the date range object", () => {
    expect(columnToZodSchema(col("tstzmultirange"))).toBe(
      "z.array(z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))",
    );
  });
});

describe("columnToZodSchema › arrays", () => {
  it("wraps the base schema in z.array() when array is set", () => {
    expect(columnToZodSchema(col("text", { array: true }))).toBe(
      "z.array(z.string())",
    );
    expect(columnToZodSchema(col("integer", { array: true }))).toBe(
      "z.array(z.number().int())",
    );
    expect(columnToZodSchema(col("uuid", { array: true }))).toBe(
      "z.array(z.string().uuid())",
    );
  });

  it("preserves .max() inside an array of bounded strings", () => {
    expect(columnToZodSchema(col("text", { array: true, length: 50 }))).toBe(
      "z.array(z.string().max(50))",
    );
  });
});

describe("columnToZodSchema › unmatched types", () => {
  it("falls back to z.unknown() for a type the switch does not cover", () => {
    expect(columnToZodSchema(col("not_a_real_type" as ColumnType))).toBe(
      "z.unknown()",
    );
  });
});

describe("columnToZodSchema › nullability is NOT applied here", () => {
  it("does not add .nullable()/.optional() regardless of the nullable flag", () => {
    // Those modifiers are appended by the schema generators, not by this fn.
    expect(columnToZodSchema(col("text", { nullable: true }))).toBe(
      "z.string()",
    );
    expect(columnToZodSchema(col("integer", { nullable: true }))).toBe(
      "z.number().int()",
    );
  });
});
