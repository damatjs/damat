import { ModuleSchema } from "@/types";
import { GenerateTypesOptions } from './utils/typeOptions';
import { DEFAULT_AUTO_FIELDS } from './defaults';
import { buildRelationMap } from './relationMap';
import { generateEnumTypes } from './utils/enum';
import { generateRowInterface } from './utils/rowInterface';
import { generateNewType } from './utils/newType';
import { generateUpdateType } from './utils/updateType';


// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate TypeScript type declarations for an entire `ModuleSchema`.
 *
 * Produces four things per model:
 *   1. `export interface Product { ... }`         — full row shape
 *   2. `export type NewProduct = { ... }`         — insert payload (defaults optional)
 *   3. `export type UpdateProduct = Partial<...>` — partial update payload
 *   4. Optional loaded-relation fields on the row interface
 *
 * Plus one `export type` per enum at the top of the file.
 *
 * The return value is the full contents of a `.ts` file ready to be written
 * to disk.  No imports are emitted — every type is self-contained.
 *
 * ```ts
 * import { toModuleSchema } from "@damatjs/orm-model";
 * import { generateTypes } from "@damatjs/orm-model/codegen";
 * import { writeFileSync } from "fs";
 *
 * const schema = toModuleSchema("store", [UserSchema, OrderSchema]);
 * writeFileSync("src/generated/types.ts", generateTypes(schema));
 * ```
 */
export function generateTypes(
  schema: ModuleSchema,
  options: GenerateTypesOptions = {},
): string {
  const autoFields = new Set([
    ...DEFAULT_AUTO_FIELDS,
    ...(options.autoFields ?? []),
  ]);

  const banner =
    options.banner === false
      ? null
      : (options.banner ??
        "// This file is auto-generated. Do not edit it manually.\n" +
        "// Re-generate by running: bun run codegen\n");

  const relationMap = buildRelationMap(schema.relationships ?? []);

  const sections: string[][] = [];
  const enums: string[][] = [];

  // ── Enums ─────────────────────────────────────────────────────────────────
  const enumLines = generateEnumTypes(schema);
  if (enumLines.length > 0) {
    enums.push(enumLines);
  }

  // ── Per-table types ───────────────────────────────────────────────────────
  for (const table of schema.tables) {
    const rels = relationMap.get(table.name) ?? [];

    sections.push(generateRowInterface(table, rels));
    sections.push(generateNewType(table, autoFields));
    sections.push(generateUpdateType(table));
  }

  const body = sections.map((s) => s.join("\n")).join("\n\n");

  return banner ? `${banner}\n${body}\n` : `${body}\n`;
}
