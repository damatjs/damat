/**
 * Type generator — writes src/generated/types.ts
 *
 * Run with:
 *   bun run codegen
 *
 * Builds the ecommerce fixture module schema and passes it to generateTypes(),
 * then writes the result to src/generated/types.ts.
 *
 * Replace the model imports and toModuleSchema() call below with your own
 * models when using this in a real project.
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { toModuleSchema } from "../src/schema/toModuleSchema";
import { generateTypes } from "../src/codegen/index";
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

const output = generateTypes(schema);

// ─── Write output ─────────────────────────────────────────────────────────────

const outPath = join(import.meta.dir, "../src/generated/types.ts");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, output, "utf8");

console.log(`Types written to ${outPath}`);
