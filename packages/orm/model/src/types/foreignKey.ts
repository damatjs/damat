
/**
 * Foreign key on delete/update action
 */
export type ForeignKeyAction =
  | "CASCADE"
  | "SET NULL"
  | "SET DEFAULT"
  | "RESTRICT"
  | "NO ACTION";

export type ForeignKeySchemaMatch = "SIMPLE" | "FULL"
/**
 * Foreign key definition
 */
export interface ForeignKeySchema {
  /** Constraint name */
  name: string;
  /** Local column(s) */
  columns: string[];
  /** Referenced table */
  referencedTable: string;
  /** Referenced column(s) */
  referencedColumns: string[];
  /** On delete action */
  onDelete?: ForeignKeyAction | undefined;
  /** On update action */
  onUpdate?: ForeignKeyAction | undefined;
  /** Whether the constraint can be deferred until transaction commit */
  deferrable?: boolean;
  /** If deferrable, start as INITIALLY DEFERRED instead of IMMEDIATE */
  initiallyDeferred?: boolean;
  /** How multi-column FKs are matched ("SIMPLE" default, or "FULL") */
  match?: ForeignKeySchemaMatch;
  /** Whether the relationship one to many or one to one */
  unique?: boolean;
  /** Whether the foreign key is nullable or not**/
  nullable?: boolean;
}
