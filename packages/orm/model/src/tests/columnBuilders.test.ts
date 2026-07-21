import { describe, it, expect } from "bun:test";
import { columns } from "@/properties";
import {
  IntervalColumnBuilder,
  RealColumnBuilder,
  DoublePrecisionColumnBuilder,
  MoneyColumnBuilder,
  CharacterVaryingColumnBuilder,
  CharacterColumnBuilder,
} from "@/properties/column";

// ─────────────────────────────────────────────────────────────────────────────
// Integer column builder — serial / int-width variants
// ─────────────────────────────────────────────────────────────────────────────

describe("IntegerColumnBuilder", () => {
  it("bigInt switches the SQL type to bigint", () => {
    expect(columns.integer().bigInt().toSchema().type).toBe("bigint");
  });

  it("smallInt switches the SQL type to smallint", () => {
    expect(columns.integer().smallInt().toSchema().type).toBe("smallint");
  });

  it("smallSerial sets type and marks autoincrement", () => {
    const schema = columns.integer().smallSerial().toSchema();
    expect(schema.type).toBe("smallserial");
    expect(schema.autoincrement).toBe(true);
  });

  it("serial sets type and marks autoincrement", () => {
    const schema = columns.integer().serial().toSchema();
    expect(schema.type).toBe("serial");
    expect(schema.autoincrement).toBe(true);
  });

  it("bigSerial sets type and marks autoincrement", () => {
    const schema = columns.integer().bigSerial().toSchema();
    expect(schema.type).toBe("bigserial");
    expect(schema.autoincrement).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Numeric column builder — precision / scale
// ─────────────────────────────────────────────────────────────────────────────

describe("NumericColumnBuilder", () => {
  it("defaults to numeric with no precision/scale", () => {
    const schema = columns.numeric().toSchema();
    expect(schema.type).toBe("numeric");
    expect(schema.length).toBeUndefined();
    expect(schema.scale).toBeUndefined();
  });

  it("precision() sets the length", () => {
    expect(columns.numeric().precision(12).toSchema().length).toBe(12);
  });

  it("scale() sets the scale", () => {
    expect(columns.numeric().scale(4).toSchema().scale).toBe(4);
  });

  it("constructor accepts precision and scale", () => {
    const schema = columns.numeric(10, 2).toSchema();
    expect(schema.length).toBe(10);
    expect(schema.scale).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Floating point / money builders
// ─────────────────────────────────────────────────────────────────────────────

describe("real / doublePrecision / money / interval builders", () => {
  it("real emits the real type", () => {
    expect(columns.real().toSchema().type).toBe("real");
    expect(columns.real()).toBeInstanceOf(RealColumnBuilder);
  });

  it("doublePrecision emits double precision type", () => {
    expect(columns.doublePrecision().toSchema().type).toBe("double precision");
    expect(columns.doublePrecision()).toBeInstanceOf(
      DoublePrecisionColumnBuilder,
    );
  });

  it("money emits the money type", () => {
    expect(columns.money().toSchema().type).toBe("money");
    expect(columns.money()).toBeInstanceOf(MoneyColumnBuilder);
  });

  it("interval emits the interval type", () => {
    expect(columns.interval().toSchema().type).toBe("interval");
    expect(columns.interval()).toBeInstanceOf(IntervalColumnBuilder);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Time / date / timestamp builders
// ─────────────────────────────────────────────────────────────────────────────

describe("TimestampColumnBuilder", () => {
  it("defaults to timestamp without time zone", () => {
    expect(columns.timestamp().toSchema().type).toBe(
      "timestamp without time zone",
    );
  });

  it("constructor withTimezone option uses timestamp with time zone", () => {
    expect(columns.timestamp({ withTimezone: true }).toSchema().type).toBe(
      "timestamp with time zone",
    );
  });

  it("withTimezone() flips to timestamp with time zone", () => {
    expect(columns.timestamp().withTimezone().toSchema().type).toBe(
      "timestamp with time zone",
    );
  });

  it("withoutTimezone() flips back to timestamp without time zone", () => {
    expect(
      columns.timestamp({ withTimezone: true }).withoutTimezone().toSchema()
        .type,
    ).toBe("timestamp without time zone");
  });

  it("defaultNow() sets now() as default", () => {
    expect(columns.timestamp().defaultNow().toSchema().default).toBe("now()");
  });
});

describe("DateColumnBuilder", () => {
  it("emits the date type", () => {
    expect(columns.date().toSchema().type).toBe("date");
  });

  it("defaultNow() sets CURRENT_DATE as default", () => {
    expect(columns.date().defaultNow().toSchema().default).toBe("CURRENT_DATE");
  });
});

describe("TimeColumnBuilder", () => {
  it("defaults to time without time zone", () => {
    expect(columns.time().toSchema().type).toBe("time without time zone");
  });

  it("withTimezone() flips to time with time zone", () => {
    expect(columns.time().withTimezone().toSchema().type).toBe(
      "time with time zone",
    );
  });

  it("withoutTimezone() flips back to time without time zone", () => {
    expect(
      columns.time().withTimezone().withoutTimezone().toSchema().type,
    ).toBe("time without time zone");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UUID builder
// ─────────────────────────────────────────────────────────────────────────────

describe("UuidColumnBuilder", () => {
  it("emits the uuid type", () => {
    expect(columns.uuid().toSchema().type).toBe("uuid");
  });

  it("defaultGenerate() sets gen_random_uuid() as default", () => {
    expect(columns.uuid().defaultGenerate().toSchema().default).toBe(
      "gen_random_uuid()",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JSON builder
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Character varying / character builders — constructor length argument
// ─────────────────────────────────────────────────────────────────────────────

describe("CharacterVaryingColumnBuilder", () => {
  it("constructor length argument seeds the length", () => {
    expect(new CharacterVaryingColumnBuilder(64).toSchema().length).toBe(64);
  });

  it("length() method also sets the length", () => {
    expect(
      new CharacterVaryingColumnBuilder().length(32).toSchema().length,
    ).toBe(32);
  });
});

describe("CharacterColumnBuilder", () => {
  it("constructor length argument seeds the length", () => {
    const schema = new CharacterColumnBuilder(8).toSchema();
    expect(schema.type).toBe("character");
    expect(schema.length).toBe(8);
  });

  it("length() method also sets the length", () => {
    expect(new CharacterColumnBuilder().length(4).toSchema().length).toBe(4);
  });
});

describe("JsonColumnBuilder", () => {
  it("defaults to json", () => {
    expect(columns.json().toSchema().type).toBe("json");
  });

  it("constructor binary option uses jsonb", () => {
    expect(columns.json({ binary: true }).toSchema().type).toBe("jsonb");
  });

  it("binary() flips json to jsonb", () => {
    expect(columns.json().binary().toSchema().type).toBe("jsonb");
  });

  it("jsonb() helper produces jsonb", () => {
    expect(columns.jsonb().toSchema().type).toBe("jsonb");
  });
});
