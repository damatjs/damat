import { ColumnSchema, ColumnType } from "@/types/column";
import { pgTypeToTsBase } from "@/utils/pgTypeToTsBase";

// ─── Column TS type resolution ────────────────────────────────────────────────

/**
 * Resolve the TypeScript type string for a single `ColumnSchema`.
 *
 * Mirrors the logic in `ColumnBuilder.toTsType()` but works from the
 * serialized `ColumnSchema` rather than a live builder instance.
 */
export const columnToTsType = (col: ColumnSchema): string => {
  // Named enum — use the enum name directly as the type reference.
  const base: string =
    col.type === "enum" && col.enum
      ? col.enum
      : pgTypeToTsBase(col.type as ColumnType);

  // Inline object-literal types (e.g. geometric / range types) need parens
  // before `| null` to keep the union unambiguous.
  const needsParens = (t: string): boolean => {
    let depth = 0;
    for (let i = 0; i < t.length - 3; i++) {
      const ch = t[i];
      if (ch === "{" || ch === "<") depth++;
      else if (ch === "}" || ch === ">") depth--;
      else if (depth === 0 && t.slice(i, i + 3) === " | ") return true;
    }
    return false;
  };

  const withArray = col.array ? `Array<${base}>` : base;

  if (!col.nullable) return withArray;
  if (!col.array && needsParens(base)) return `(${base}) | null`;
  return `${withArray} | null`;
}
