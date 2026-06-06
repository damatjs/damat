import { ColumnSchema, ColumnType } from "@damatjs/orm-type";

/**
 * Resolve the Zod schema string for a single `ColumnSchema`.
 *
 * Maps PostgreSQL column types to their corresponding Zod validators.
 * Does NOT include `.optional()` or `.nullable()` - those are added separately.
 */
export const columnToZodSchema = (col: ColumnSchema): string => {
  const baseType = getZodBaseType(col.type as ColumnType, col);

  // Wrap in array if needed
  if (col.array) {
    return `z.array(${baseType})`;
  }

  return baseType;
};

/**
 * Maps a PostgreSQL ColumnType to its base Zod schema string.
 */
function getZodBaseType(type: ColumnType, col: ColumnSchema): string {
  switch (type) {
    // ── Integers ────────────────────────────────────────────────────────
    case "smallint":
    case "integer":
    case "smallserial":
    case "serial":
      return "z.number().int()";

    case "bigint":
    case "bigserial":
      return "z.bigint()";

    // ── Floating point & exact numeric ───────────────────────────────────
    case "real":
    case "double precision":
      return "z.number()";

    case "numeric":
    case "decimal":
      // Numeric can have precision/scale - represent as number
      return "z.number()";

    // ── Money ────────────────────────────────────────────────────────────
    case "money":
      return "z.string()";

    // ── Character types ──────────────────────────────────────────────────
    case "text":
    case "character":
    case "character varying":
      if (col.length) {
        return `z.string().max(${col.length})`;
      }
      return "z.string()";

    // ── Binary ───────────────────────────────────────────────────────────
    case "bytea":
      // Could be Buffer in Node.js or ArrayBuffer in browser
      return "z.unknown()";

    // ── Date / Time ───────────────────────────────────────────────────────
    case "timestamp without time zone":
    case "timestamp with time zone":
    case "date":
      return "z.coerce.date()";

    case "time without time zone":
    case "time with time zone":
      return "z.string()";

    case "interval":
      return "z.object({ years: z.number(), months: z.number(), days: z.number(), hours: z.number(), minutes: z.number(), seconds: z.number(), milliseconds: z.number() })";

    // ── Boolean ──────────────────────────────────────────────────────────
    case "boolean":
      return "z.boolean()";

    // ── Enum ─────────────────────────────────────────────────────────────
    case "enum":
      // Enums are handled separately with the actual enum values
      return "z.string()";

    // ── JSON ─────────────────────────────────────────────────────────────
    case "json":
    case "jsonb":
      return "z.unknown()";

    case "jsonpath":
      return "z.string()";

    // ── UUID / XML / bit strings ─────────────────────────────────────────
    case "uuid":
      return "z.string().uuid()";

    case "xml":
    case "bit":
    case "bit varying":
      return "z.string()";

    // ── Network address types ────────────────────────────────────────────
    case "cidr":
    case "inet":
      return "z.string()";

    case "macaddr":
    case "macaddr8":
      return "z.string()";

    // ── Geometric types ──────────────────────────────────────────────────
    case "point":
      return "z.object({ x: z.number(), y: z.number() })";

    case "lseg":
    case "box":
      return "z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() })";

    case "circle":
      return "z.object({ x: z.number(), y: z.number(), radius: z.number() })";

    case "line":
    case "path":
    case "polygon":
      return "z.string()";

    // ── Text search types ─────────────────────────────────────────────────
    case "tsvector":
    case "tsquery":
      return "z.string()";

    // ── Range types ───────────────────────────────────────────────────────
    case "int4range":
    case "int8range":
    case "numrange":
      return "z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";

    case "tsrange":
    case "tstzrange":
    case "daterange":
      return "z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() })";

    // ── Multirange types ──────────────────────────────────────────────────
    case "int4multirange":
    case "int8multirange":
    case "nummultirange":
      return "z.array(z.object({ lower: z.number().nullable(), upper: z.number().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))";

    case "tsmultirange":
    case "tstzmultirange":
    case "datemultirange":
      return "z.array(z.object({ lower: z.date().nullable(), upper: z.date().nullable(), isLowerBoundClosed: z.boolean(), isUpperBoundClosed: z.boolean(), isEmpty: z.boolean() }))";

    // ── Object identifier / system types ─────────────────────────────────
    case "oid":
      return "z.number().int()";

    case "pg_lsn":
    case "pg_snapshot":
      return "z.string()";

    default:
      return "z.unknown()";
  }
}
