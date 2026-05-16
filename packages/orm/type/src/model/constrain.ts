import type { IndexType } from "./indexType";

/**
 * Constraint types
 */
export type ConstraintType = "unique" | "primary_key" | "check" | "exclude";

/**
 * Base interface for all constraints
 */
export interface Constraint {
  /** Constraint name (auto-generated if omitted) */
  name?: string;
  /** Type of constraint */
  type: ConstraintType;
  /** Partial index condition */
  where?: string | undefined;
  /** Whether the constraint can be deferred until transaction commit */
  deferrable?: boolean;
  /** If deferrable, start as INITIALLY DEFERRED instead of IMMEDIATE */
  initiallyDeferred?: boolean;
}

/**
 * Unique constraint
 */
export interface UniqueConstraint extends Constraint {
  type: "unique";
  columns: string[];
}

/**
 * Primary key constraint
 */
export interface PrimaryKeyConstraint extends Constraint {
  type: "primary_key";
  columns: string[];
}

/**
 * Check constraint
 */
export interface CheckConstraint extends Constraint {
  type: "check";
  condition: string;
}

/**
 * Exclude constraint
 */
export interface ExcludeConstraint extends Constraint {
  type: "exclude";
  /** Array of column operators and expressions */
  expressions: {
    column: string;
    operator: string;
    expression?: string;
  }[];
  /** Index type for exclude constraint (typically gist) */
  indexType?: IndexType;
}

/**
 * Union type for all constraint types
 */
export type ConstraintSchema =
  | UniqueConstraint
  | PrimaryKeyConstraint
  | CheckConstraint
  | ExcludeConstraint;
