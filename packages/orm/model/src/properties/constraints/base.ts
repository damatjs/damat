import { ConstraintType, ExcludeConstraint, ConstraintSchema } from "@/types";
import { IndexType } from "@/types";

/**
 * Constraint builder for fluent API.
 *
 * The constraint type is declared via a dedicated method rather than being
 * passed to the constructor — this makes the intent unambiguous and lets AI
 * code-generation produce self-documenting definitions.
 *
 * Usage:
 * ```ts
 * constrainBuilder("name_idx").columns([table.name]).unique()
 * constrainBuilder("email_uniq").columns(["email"]).unique()
 * constrainBuilder("orders_pkey").columns(["id"]).primaryKey()
 * constrainBuilder("age_check").check("age > 0")
 * constrainBuilder("room_excl").exclude([{ column: "during", operator: "&&" }])
 * ```
 */
export class ConstraintBuilder {
  private _name: string;
  private _type?: ConstraintType;
  private _columns: string[] = [];
  private _condition?: string;
  private _expressions: {
    column: string;
    operator: string;
    expression?: string;
  }[] = [];
  private _indexType: IndexType = "gist";
  private _where?: string;
  private _deferrable?: boolean;
  private _initiallyDeferred?: boolean;

  constructor(name?: string) {
    this._name = name || "";
  }

  /** Set columns for unique or primary key constraint */
  columns(columns: string[]): this {
    this._columns = columns;
    return this;
  }

  /** Mark this constraint as a UNIQUE constraint */
  unique(): this {
    this._type = "unique";
    return this;
  }

  /** Mark this constraint as a PRIMARY KEY constraint */
  primaryKey(): this {
    this._type = "primary_key";
    return this;
  }

  /**
   * Mark this constraint as a CHECK constraint.
   * @param condition  SQL expression that must evaluate to true (e.g. `"age > 0"`)
   */
  check(condition: string): this {
    this._type = "check";
    this._condition = condition;
    return this;
  }

  /**
   * Mark this constraint as an EXCLUDE constraint.
   * @param expressions  Array of `{ column, operator, expression? }` entries
   */
  exclude(
    expressions: {
      column: string;
      operator: string;
      expression?: string;
    }[],
  ): this {
    this._type = "exclude";
    this._expressions = expressions;
    return this;
  }

  /** Set index type for exclude constraint (default: "gist") */
  indexType(indexType: IndexType): this {
    this._indexType = indexType;
    return this;
  }

  /** Add a partial constraint WHERE condition */
  where(condition: string): this {
    this._where = condition;
    return this;
  }

  /** Make constraint deferrable; pass `true` to start as INITIALLY DEFERRED */
  deferrable(initiallyDeferred: boolean = false): this {
    this._deferrable = true;
    this._initiallyDeferred = initiallyDeferred;
    return this;
  }

  /** Convert to ConstraintSchema */
  toSchema(): ConstraintSchema {
    if (!this._type) {
      throw new Error(
        `ConstraintBuilder "${this._name}": constraint type must be declared via .unique(), .primaryKey(), .check(), or .exclude()`,
      );
    }
    if (!this._name || this._name === "") {
      this._name = `${this._type}_${this._columns.map((col) => col).join("_")}`;
    }

    let schema: ConstraintSchema;

    if (this._type === "unique") {
      schema = {
        name: this._name,
        type: "unique",
        columns: this._columns,
      };
    } else if (this._type === "primary_key") {
      schema = {
        name: `${this._name}_pkey`,
        type: "primary_key",
        columns: this._columns,
      };
    } else if (this._type === "check") {
      schema = {
        name: this._name,
        type: "check",
        condition: this._condition!,
      };
    } else {
      // exclude
      schema = {
        name: this._name,
        type: "exclude",
        expressions: this._expressions,
        indexType: this._indexType,
      } as ExcludeConstraint;
    }

    // Common optional properties
    if (this._where !== undefined) schema.where = this._where;
    if (this._deferrable !== undefined) schema.deferrable = this._deferrable;
    if (this._initiallyDeferred !== undefined)
      schema.initiallyDeferred = this._initiallyDeferred;

    return schema;
  }
}
