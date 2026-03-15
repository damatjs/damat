/**
 * Foreign key on delete/update action
 */
export type ForeignKeyAction =
    | "CASCADE"
    | "SET NULL"
    | "SET DEFAULT"
    | "RESTRICT"
    | "NO ACTION";

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
    /** Whether the relationship one to many or one to one */
    unique?: boolean;
    /** Whether the constraint can be deferred until transaction commit */
    deferrable?: boolean;
    /** If deferrable, start as INITIALLY DEFERRED instead of IMMEDIATE */
    initiallyDeferred?: boolean;
    /** How multi-column FKs are matched ("SIMPLE" default, or "FULL") */
    match?: "SIMPLE" | "FULL";
}

/**
 * Relation type enumeration
 */
export type RelationType = "belongsTo" | "hasMany" | "hasOne";

/**
 * Options for belongsTo relation
 */
export interface BelongsToOptions {
    /** The foreign key column name */
    foreignKey?: string;
    /** The property name on the related model that maps back */
    mappedBy?: string;
}

/**
 * Options for hasMany/hasOne relation
 */
export interface HasManyOptions {
    /** The property name on the related model that maps back */
    mappedBy: string;
}

/**
 * Relation definition stored in model
 */
export interface RelationDefinition {
    type: RelationType;
    /** Function that returns the related model name (for lazy evaluation) */
    target: () => string;
    /** Foreign key column name (for belongsTo) */
    foreignKey?: string;
    /** Mapped by property name */
    mappedBy?: string;
    /** Whether the relation is nullable */
    nullable: boolean;
    /** On delete action */
    onDelete?: ForeignKeyAction;
    /** On update action */
    onUpdate?: ForeignKeyAction;
}
