/**
 * Type generator — writes one .ts file per table into scripts/generated/types/
 *
 * Run with:
 *   bun run codegen
 *
 * Builds the ecommerce fixture module schema and passes it to generateFilesMap(),
 * then writes each file into scripts/generated/types/.
 *
 * Replace the model imports and toModuleSchema() call below with your own
 * models when using this in a real project.
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import { toModuleSchema } from "../src/schema/toModuleSchema";
import { generateFilesMap } from "../src/codegen/index";
import {
  CategorySchema,
  OrderSchema,
  OrderItemSchema,
  ProductSchema,
  UserSchema,
} from "../src/tests/__fixtures__/models";
import { OrderStatusEnum } from "../src/tests/__fixtures__/order";
import { ProductStatusEnum } from "../src/tests/__fixtures__/product";

// ─── Build module schema ──────────────────────────────────────────────────────

const schema = toModuleSchema(
  "ecommerce",
  [CategorySchema, ProductSchema, OrderSchema, OrderItemSchema, UserSchema],
  { enums: [ProductStatusEnum, OrderStatusEnum] },
);

// ─── Generate types ───────────────────────────────────────────────────────────

const files = generateFilesMap(schema);

// ─── Write output ─────────────────────────────────────────────────────────────

const outDir = join(
  import.meta.dir,
  "../src/tests/__snapshots__/generated/types",
);

mkdirSync(outDir, { recursive: true });

for (const [name, content] of files) {
  const outPath = join(outDir, name);
  writeFileSync(outPath, content, "utf8");
  console.log(`  written → ${outPath}`);
}

console.log(`\nTypes written to ${outDir}/`);
