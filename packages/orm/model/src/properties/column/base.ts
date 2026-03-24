import { ColumnSchema, ColumnType } from "@/types";
import { pgTypeToTsBase } from "@/utils/pgTypeToTsBase";

/**
 * Base column builder providing fluent API for column definition
 */
export class ColumnBuilder {
  protected _name: string = "";
  protected _type: ColumnType;
  protected _primaryKey: boolean = false;
  protected _nullable: boolean = false;
  protected _unique: boolean = false;
  protected _default?: string;
  protected _length?: number;
  protected _scale?: number;
  protected _enum?: string;
  protected _enumTsType?: string;
  protected _array: boolean = false;
  protected _fieldName?: string;
  protected _autoincrement: boolean = false;

  constructor(type: ColumnType) {
    this._type = type;
  }

  /** Mark column as primary key */
  primaryKey(): this {
    this._primaryKey = true;
    return this;
  }

  /** Mark column as nullable */
  nullable(): this {
    this._nullable = true;
    return this;
  }

  /** Mark column as unique */
  unique(): this {
    this._unique = true;
    return this;
  }

  /** Set default value */
  default(value: string | number | boolean): this {
    if (typeof value === "string") {
      this._default = `'${value}'`;
    } else {
      this._default = String(value);
    }
    return this;
  }

  /** Set default to raw SQL expression */
  defaultRaw(expression: string): this {
    this._default = expression;
    return this;
  }

  /** Set column as array type */
  array(): this {
    this._array = true;
    return this;
  }

  /** Set database field name if different from property name */
  fieldName(name: string): this {
    this._fieldName = name;
    return this;
  }

  /** Internal: set column name */
  _setName(name: string): this {
    this._name = name;
    return this;
  }

  /** Convert to ColumnSchema */
  toSchema(): ColumnSchema {
    const schema: ColumnSchema = {
      name: this._name,
      type: this._type,
      primaryKey: this._primaryKey,
      nullable: this._nullable,
      unique: this._unique,
      array: this._array,
      autoincrement: this._autoincrement,
    };

    if (this._default !== undefined) {
      schema.default = this._default;
    }
    if (this._length !== undefined) {
      schema.length = this._length;
    }
    if (this._scale !== undefined) {
      schema.scale = this._scale;
    }
    if (this._enum !== undefined) {
      schema.enum = this._enum;
    }
    if (this._fieldName !== undefined) {
      schema.fieldName = this._fieldName;
    }

    return schema;
  }

  /**
   * Returns the TypeScript type string for this column — accounting for array
   * wrapping and nullability.
   *
   * For enum columns the TS type string is taken directly from the EnumBuilder
   * that was passed at construction time (stored in _enumTsType), so pgTypeToTsBase
   * is bypassed entirely. The union is declared once on the EnumBuilder; here
   * we only reference the name.
   *
   * Examples:
   *   integer                            → "number"
   *   integer         + nullable         → "number | null"
   *   text            + array            → "Array<string>"
   *   text            + array + nullable → "Array<string> | null"
   *   enum(Status)                       → "Status"
   *   enum(Status)    + nullable         → "Status | null"
   *   enum(Status)    + array            → "Array<Status>"
   *   point                              → "{ x: number; y: number }"
   *   point           + nullable         → "{ x: number; y: number } | null"
   */
  toTsType(): string {
    // Enum: use the TS type extracted from the EnumBuilder, bypassing pgTypeToTsBase
    const base =
      this._type === "enum" && this._enumTsType
        ? this._enumTsType
        : pgTypeToTsBase(this._type);

    const baseNeedsParens = (b: string): boolean => {
      let depth = 0;
      for (let i = 0; i < b.length - 3; i++) {
        const ch = b[i];
        if (ch === "{" || ch === "<") depth++;
        else if (ch === "}" || ch === ">") depth--;
        else if (depth === 0 && b.slice(i, i + 3) === " | ") return true;
      }
      return false;
    };

    const withArray = this._array ? `Array<${base}>` : base;

    if (!this._nullable) {
      return withArray;
    }

    if (!this._array && baseNeedsParens(base)) {
      return `(${base}) | null`;
    }

    return `${withArray} | null`;
  }
}
