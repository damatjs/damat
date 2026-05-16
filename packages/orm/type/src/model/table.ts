import { ColumnSchema } from "./column";
import { IndexSchema } from "./indexType";
import { ForeignKeySchema } from "./foreignKey";
import { ConstraintSchema } from "./constrain";
import { RelationSchema } from "./relation";

/**
 * Complete table schema definition.
 *
 * `relations` carries the module-level relation map for every relation
 * property defined on the model (hasMany, hasOne, and belongsTo).
 * It is produced by each relation builder's `.toRelationSchema()` method
 * and collected by `ModelDefinition.toTableSchema()`.
 */
export interface TableSchema {
  /** Table name */
  name: string;
  /** Column definitions */
  columns: ColumnSchema[];
  /** Index definitions */
  indexes: IndexSchema[];
  /** Foreign key definitions */
  foreignKeys: ForeignKeySchema[];
  /** Constraint definitions */
  constraints: ConstraintSchema[];
  /** Relation map (all relation types — no DB artifact, ORM metadata) */
  relations: RelationSchema[];
}
