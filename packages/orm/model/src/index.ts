/**
 * damatjs/orm-model Module - Database Model & Column Transformer Layer
 *
 * Provides a fluent schema-building API (`model.define`) to programmatically
 * define entities, relationships, indexes, and primary keys for MikroORM. 
 * Also serves as the main configuration and connection layer.
 *
 * ## Quick Start: Model Definition
 *
 * ```typescript
 * import { model } from '@damatjs/orm-model/transform';
 *
 * // 1. Build your entities using the fluent model builder
 * export const Product = model.define('product', {
 *   id: model.id().primaryKey(),
 *   title: model.varchar(255),
 *   price: model.decimal(10, 2),
 *   category_id: model.belongsTo(() => Category).nullable(),
 * }).indexes([
 *   { name: 'idx_product_price', columns: ['price'] }
 * ]);
 *
 * // 2. Convert to TableSchema or register with MikroORM
 * const schema = Product.toTableSchema();
 * ```
 *
 * ## Quick Start: Connection Management
 * 
 * ```typescript
 * import { initConnection, getConnection } from '@damatjs/orm-model';
 * 
 * await initConnection({
 *   database: { url: process.env.DATABASE_URL! },
 *   modules: [{ name: 'shop', entities: [Product] }]
 * });
 * ```
 *
 * @see model.md for detailed documentation
 */

// =============================================================================
// TYPES
// =============================================================================

export type * from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

export * from "./config";

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================

export * from "./connection";
