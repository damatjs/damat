import { EnumBuilder } from "@/properties/enum";
import { ColumnBuilder } from "./base";

/**
 * Enum column builder.
 *
 * Accepts a pre-declared EnumBuilder. At construction time the enum name and
 * its TS type string are extracted and stored as plain strings — the column
 * holds no live reference to the EnumBuilder afterwards. This mirrors how
 * PostgreSQL columns reference a named CREATE TYPE by name rather than
 * re-declaring the values inline.
 *
 * Usage:
 *   const Status = new EnumBuilder(['active', 'inactive']).name('Status');
 *   new EnumColumnBuilder(Status)
 *     // toSchema().enum  → "Status"
 *     // toTsType()       → "Status"  (name, not the expanded union)
 */
export class EnumColumnBuilder extends ColumnBuilder {
  constructor(enumType: EnumBuilder) {
    super("enum");
    // Store only the name — used as the PG type reference in the schema
    this._enum = enumType.toTsTypeName();
    // Store the TS type string — used by toTsType() to bypass pgTypeToTsBase
    this._enumTsType = enumType.toTsTypeName();
  }
}
