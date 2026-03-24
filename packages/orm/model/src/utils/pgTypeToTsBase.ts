import { ColumnType } from "@/types";

// ---------------------------------------------------------------------------
// Structured TypeScript interfaces for PostgreSQL composite return types.
// These are what the pg driver actually deserialises into — using inline
// type strings keeps convert.ts self-contained without needing extra exports.
// ---------------------------------------------------------------------------

// Geometric types returned by pg driver as plain objects
// point  → { x: number; y: number }
// lseg   → { x1: number; y1: number; x2: number; y2: number }
// box    → { x1: number; y1: number; x2: number; y2: number }  (same shape as lseg)
// circle → { x: number; y: number; radius: number }
// line, path, polygon → string (pg returns these serialised)

// Range types returned by pg driver as objects
// { lower: T | null; upper: T | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }

// Interval returned by pg driver as object
// { years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }

/**
 * Maps a PostgreSQL ColumnType to its base TypeScript type string.
 *
 * Rules:
 *   - "base" means without nullability or array wrapping; those are applied
 *     separately in toTsType() on the ColumnBuilder.
 *   - Types are mapped to what the node-postgres (pg) driver actually returns
 *     at runtime, not to what would be conceptually ideal.
 *   - Where the pg driver returns a structured object the type string is the
 *     inline object literal that exactly matches that shape.
 */
export function pgTypeToTsBase(type: ColumnType): string {
  switch (type) {
    // ── Integers ────────────────────────────────────────────────────────
    // smallint / integer / serial / smallserial all fit in JS number
    case "smallint":
    case "integer":
    case "smallserial":
    case "serial":
      return "number";

    // bigint / bigserial — pg driver returns native JS bigint for int8
    case "bigint":
    case "bigserial":
      return "bigint";

    // ── Floating point & exact numeric ───────────────────────────────────
    case "real":
    case "double precision":
    case "numeric":
    case "decimal":
      return "number";

    // money — pg driver returns a string like "$1,234.56" (locale-dependent)
    case "money":
      return "string";

    // ── Character types ──────────────────────────────────────────────────
    case "text":
    case "character":
    case "character varying":
      return "string";

    // ── Binary ───────────────────────────────────────────────────────────
    // pg driver materialises bytea as a Node.js Buffer
    case "bytea":
      return "Buffer";

    // ── Date / Time ──────────────────────────────────────────────────────
    // pg driver parses timestamp and date columns into Date objects
    case "timestamp without time zone":
    case "timestamp with time zone":
    case "date":
      return "Date";

    // time columns come back as "HH:MM:SS" strings from pg driver
    case "time without time zone":
    case "time with time zone":
      return "string";

    // interval — pg driver deserialises to a structured object
    case "interval":
      return "{ years: number; months: number; days: number; hours: number; minutes: number; seconds: number; milliseconds: number }";

    // ── Boolean ──────────────────────────────────────────────────────────
    case "boolean":
      return "boolean";

    // ── Enum ─────────────────────────────────────────────────────────────
    // Columns that use EnumBuilder resolve to the named type alias before
    // reaching this function. This fallback handles raw / unresolved cases.
    case "enum":
      return "string";

    // ── JSON ─────────────────────────────────────────────────────────────
    // jsonb / json are parsed by pg driver but the shape is genuinely unknown
    case "json":
    case "jsonb":
      return "unknown";

    // jsonpath comes back as a string
    case "jsonpath":
      return "string";

    // ── UUID / XML / bit strings ─────────────────────────────────────────
    case "uuid":
    case "xml":
    case "bit":
    case "bit varying":
      return "string";

    // ── Network address types ────────────────────────────────────────────
    // pg driver returns inet/cidr/macaddr/macaddr8 as strings
    case "cidr":
    case "inet":
    case "macaddr":
    case "macaddr8":
      return "string";

    // ── Geometric types ──────────────────────────────────────────────────
    // pg driver returns point as { x: number; y: number }
    case "point":
      return "{ x: number; y: number }";

    // lseg and box share the same four-coordinate shape
    case "lseg":
    case "box":
      return "{ x1: number; y1: number; x2: number; y2: number }";

    // circle has a centre point plus radius
    case "circle":
      return "{ x: number; y: number; radius: number }";

    // line, path, polygon — pg driver returns these serialised as strings
    case "line":
    case "path":
    case "polygon":
      return "string";

    // ── Text search types ─────────────────────────────────────────────────
    // pg returns tsvector and tsquery as their text representations
    case "tsvector":
    case "tsquery":
      return "string";

    // ── Range types ───────────────────────────────────────────────────────
    // pg driver deserialises ranges to objects with lower/upper bounds.
    // The bound type matches the element type of the range.

    // int4range — integer bounds
    case "int4range":
      return "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";

    // int8range — bigint bounds
    case "int8range":
      return "{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";

    // numrange — numeric (number) bounds
    case "numrange":
      return "{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";

    // tsrange / tstzrange — timestamp bounds (Date objects)
    case "tsrange":
    case "tstzrange":
      return "{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";

    // daterange — date bounds (Date objects)
    case "daterange":
      return "{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }";

    // ── Multirange types ──────────────────────────────────────────────────
    // Multiranges are arrays of their corresponding range type

    case "int4multirange":
      return "Array<{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>";

    case "int8multirange":
      return "Array<{ lower: bigint | null; upper: bigint | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>";

    case "nummultirange":
      return "Array<{ lower: number | null; upper: number | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>";

    case "tsmultirange":
    case "tstzmultirange":
      return "Array<{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>";

    case "datemultirange":
      return "Array<{ lower: Date | null; upper: Date | null; isLowerBoundClosed: boolean; isUpperBoundClosed: boolean; isEmpty: boolean }>";

    // ── Object identifier / system types ─────────────────────────────────
    // oid comes back as a JS number from pg driver
    case "oid":
      return "number";

    // pg_lsn and pg_snapshot come back as strings
    case "pg_lsn":
    case "pg_snapshot":
      return "string";
  }
}

/**
 * Maps enum values to a TypeScript string-literal union type.
 * Returns plain `string` when no values are provided.
 * Can be used independently wherever an enum type string is needed
 * without going through the full pgTypeToTsBase switch.
 */
export function enumTypeToTsBase(enumValues?: string[]): string {
  if (enumValues && enumValues.length > 0) {
    return enumValues.map((v) => `'${v}'`).join(" | ");
  }
  return "string";
}
