import { EnumSchema, RelationSchema, TableSchema } from "./";

/**
 * Schema for an entire module (collection of tables)
 */
export interface ModuleSchema {
  /** Schema name (default: public) */
  schema?: string;
  /** Module name */
  moduleName: string;
  /** Tables in the module */
  tables: Omit<TableSchema, "relations">[];
  /** Enum types defined in the module */
  enums: EnumSchema[];
  /** Relation Schema for the module — all relations collected from every table */
  relationships: RelationSchema[];
}
