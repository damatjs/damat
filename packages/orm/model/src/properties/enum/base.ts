import { EnumSchema } from "@/types";
import { enumTypeToTsBase } from "@/utils/pgTypeToTsBase";

/**
 * Defines a named PostgreSQL enum type — analogous to:
 *   CREATE TYPE <name> AS ENUM ('val1', 'val2', ...)
 *
 * The enum is declared once and referenced by EnumColumnBuilder so that the
 * corresponding TypeScript union type is emitted a single time and all columns
 * that use it simply reference the type name.
 */
export class EnumBuilder {
  protected _name: string = "";
  protected _values: string[];

  constructor(values: string[]) {
    this._values = values;
  }

  /** Set the enum name (used as both the PG type name and the TS type alias) */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /** Convert to EnumSchema */
  toSchema(): EnumSchema {
    const schema: EnumSchema = {
      name: this._name,
      values: this._values,
    };
    return schema;
  }

  /**
   * Returns the TypeScript type alias declaration for this enum, e.g.:
   *   type Status = 'active' | 'inactive' | 'pending'
   *
   * Emit this once when generating the schema file; columns reference the
   * name returned by toTsTypeName() rather than re-expanding the union.
   */
  toTsTypeDeclaration(): string {
    return `export type ${this._name} = ${enumTypeToTsBase(this._values)};`;
  }

  /**
   * Returns just the type name to be used as a reference in column types.
   * e.g. "Status"  — so a nullable column becomes "Status | null"
   */
  toTsTypeName(): string {
    return this._name;
  }
}
