// import { ColumnType } from "@/types/column";
// import {
//   ForeignKeyAction,
//   ForeignKeySchema,
//   ForeignKeySchemaMatch,
// } from "@/types/foreignKey";
// import { ConstraintOptions } from "@/types";

// /**
//  * Configuration for creating a ForeignKeyBuilder
//  */
// export interface ForeignKeyBuilderConfig {
//   /** The source table name (where the FK column lives) */
//   sourceTable: string;

//   /** The FK column name(s) on the source table */
//   columns: string[];

//   /** The target/referenced table name */
//   referencedTable: string;

//   /** The referenced column(s) on the target table (defaults to ['id']) */
//   referencedColumns?: string[];
// }

// /**
//  * ForeignKeyBuilder - The foundation for all FK-related operations
//  *
//  * This builder creates foreign key constraints with a fluent API.
//  * It can be used standalone or composed by relation builders.
//  *
//  * Design Philosophy:
//  * - Explicit configuration over magic
//  * - Sensible defaults (references 'id', SET NULL on delete)
//  * - Full control when needed (all PostgreSQL FK options)
//  * - Composable - can be created from config objects
//  *
//  * Example (standalone):
//  * ```ts
//  * const fk = new ForeignKeyBuilder({
//  *   sourceTable: 'posts',
//  *   columns: ['author_id'],
//  *   referencedTable: 'users'
//  * })
//  *   .onDelete('CASCADE')
//  *   .onUpdate('CASCADE')
//  *   .deferrable()
//  * ```
//  *
//  * Example (from relation):
//  * ```ts
//  * // BelongsToBuilder creates this internally
//  * const fk = ForeignKeyBuilder.fromRelation({
//  *   sourceTable: 'posts',
//  *   relationName: 'author',
//  *   targetTable: 'users',
//  *   fields: 'author_id',
//  *   references: 'id'
//  * })
//  * ```
//  */
// export class ForeignKeyBuilder {
//   private _sourceTable: string;
//   private _columns: string[];
//   private _referencedTable: string;
//   private _referencedColumns: string[];

//   // Constraint options
//   private _constraintName?: string;
//   private _onDelete?: ForeignKeyAction;
//   private _onUpdate?: ForeignKeyAction;
//   private _deferrable?: boolean;
//   private _initiallyDeferred?: boolean;
//   private _match?: ForeignKeySchemaMatch;

//   // Column-level options (used when generating the FK column)
//   private _unique?: boolean;
//   private _nullable?: boolean;
//   private _columnType?: ColumnType;
//   private _indexed?: boolean;

//   constructor(config: ForeignKeyBuilderConfig) {
//     this._sourceTable = config.sourceTable;
//     this._columns = config.columns;
//     this._referencedTable = config.referencedTable;
//     this._referencedColumns = config.referencedColumns ?? ["id"];
//   }

//   /**
//    * Create a ForeignKeyBuilder from relation parameters
//    * This is the bridge between relation builders and FK generation
//    */
//   static fromRelation(params: {
//     sourceTable: string;
//     relationName: string;
//     targetTable: string;
//     fields?: string | string[];
//     references?: string | string[];
//   }): ForeignKeyBuilder {
//     // Normalize fields - default to `<relationName>_id`
//     const columns = params.fields
//       ? Array.isArray(params.fields)
//         ? params.fields
//         : [params.fields]
//       : [`${params.relationName}_id`];

//     // Normalize references - default to ['id']
//     const referencedColumns = params.references
//       ? Array.isArray(params.references)
//         ? params.references
//         : [params.references]
//       : ["id"];

//     return new ForeignKeyBuilder({
//       sourceTable: params.sourceTable,
//       columns,
//       referencedTable: params.targetTable,
//       referencedColumns,
//     });
//   }

//   /**
//    * Apply constraint configuration from options object
//    */
//   applyConstraintConfig(config: ConstraintOptions): this {
//     if (config.name !== undefined) {
//       this._constraintName = config.name;
//     }
//     if (config.onDelete !== undefined) {
//       this._onDelete = config.onDelete;
//     }
//     if (config.onUpdate !== undefined) {
//       this._onUpdate = config.onUpdate;
//     }
//     if (config.deferrable !== undefined) {
//       this._deferrable = config.deferrable;
//     }
//     if (config.initiallyDeferred !== undefined) {
//       this._initiallyDeferred = config.initiallyDeferred;
//     }
//     if (config.match !== undefined) {
//       this._match = config.match;
//     }
//     return this;
//   }

//   // ─────────────────────────────────────────────────────────────────
//   // Fluent API - Constraint Configuration
//   // ─────────────────────────────────────────────────────────────────

//   /** Set the constraint name (auto-generated if not set) */
//   name(constraintName: string): this {
//     this._constraintName = constraintName;
//     return this;
//   }

//   /** Set ON DELETE action */
//   onDelete(action: ForeignKeyAction): this {
//     this._onDelete = action;
//     return this;
//   }

//   /** Set ON UPDATE action */
//   onUpdate(action: ForeignKeyAction): this {
//     this._onUpdate = action;
//     return this;
//   }

//   /** Make constraint deferrable */
//   deferrable(initiallyDeferred: boolean = false): this {
//     this._deferrable = true;
//     this._initiallyDeferred = initiallyDeferred;
//     return this;
//   }

//   /** Set MATCH type for multi-column FKs */
//   match(type: ForeignKeySchemaMatch): this {
//     this._match = type;
//     return this;
//   }

//   // ─────────────────────────────────────────────────────────────────
//   // Fluent API - Column Configuration
//   // ─────────────────────────────────────────────────────────────────

//   /** Mark FK column as unique (for one-to-one) */
//   unique(): this {
//     this._unique = true;
//     return this;
//   }

//   /** Mark FK column as nullable */
//   nullable(): this {
//     this._nullable = true;
//     return this;
//   }

//   /** Set the column type for the FK column */
//   columnType(type: ColumnType): this {
//     this._columnType = type;
//     return this;
//   }

//   /** Create an index on the FK column */
//   indexed(): this {
//     this._indexed = true;
//     return this;
//   }

//   // ─────────────────────────────────────────────────────────────────
//   // Getters
//   // ─────────────────────────────────────────────────────────────────

//   /** Get the source table name */
//   getSourceTable(): string {
//     return this._sourceTable;
//   }

//   /** Get the FK column name(s) */
//   getColumns(): string[] {
//     return this._columns;
//   }

//   /** Get the first/primary FK column name */
//   getPrimaryColumn(): string | undefined {
//     return this._columns[0];
//   }

//   /** Get the referenced table name */
//   getReferencedTable(): string {
//     return this._referencedTable;
//   }

//   /** Get the referenced column(s) */
//   getReferencedColumns(): string[] {
//     return this._referencedColumns;
//   }

//   /** Check if FK is nullable */
//   isNullable(): boolean {
//     return this._nullable ?? false;
//   }

//   /** Check if FK should be unique */
//   isUnique(): boolean {
//     return this._unique ?? false;
//   }

//   /** Check if FK should be indexed */
//   isIndexed(): boolean {
//     return this._indexed ?? false;
//   }

//   /** Get the column type (for FK column generation) */
//   getColumnType(): ColumnType | undefined {
//     return this._columnType;
//   }

//   /** Get the constraint name (auto-generated if not set) */
//   getConstraintName(): string {
//     if (this._constraintName) {
//       return this._constraintName;
//     }
//     // Auto-generate: fk_<sourceTable>_<columns>
//     return `fk_${this._sourceTable}_${this._columns.join("_")}`;
//   }

//   // ─────────────────────────────────────────────────────────────────
//   // Schema Generation
//   // ─────────────────────────────────────────────────────────────────

//   /**
//    * Convert to ForeignKeySchema for table generation
//    */
//   toSchema(): ForeignKeySchema {
//     const schema: ForeignKeySchema = {
//       name: this.getConstraintName(),
//       columns: this._columns,
//       referencedTable: this._referencedTable,
//       referencedColumns: this._referencedColumns,
//     };

//     // Only add optional properties if they have values
//     if (this._onDelete !== undefined) {
//       schema.onDelete = this._onDelete;
//     }
//     if (this._onUpdate !== undefined) {
//       schema.onUpdate = this._onUpdate;
//     }
//     if (this._unique !== undefined) {
//       schema.unique = this._unique;
//     }
//     if (this._nullable !== undefined) {
//       schema.nullable = this._nullable;
//     }
//     if (this._deferrable !== undefined) {
//       schema.deferrable = this._deferrable;
//     }
//     if (this._initiallyDeferred !== undefined) {
//       schema.initiallyDeferred = this._initiallyDeferred;
//     }
//     if (this._match !== undefined) {
//       schema.match = this._match;
//     }

//     return schema;
//   }
// }
