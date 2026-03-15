import { ColumnSchema, ColumnType } from "@/types";

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
  protected _enumName?: string;
  protected _enumValues?: string[];
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

    // Only add optional properties if they have values
    if (this._default !== undefined) {
      schema.default = this._default;
    }
    if (this._length !== undefined) {
      schema.length = this._length;
    }
    if (this._scale !== undefined) {
      schema.scale = this._scale;
    }
    if (this._enumName !== undefined) {
      schema.enumName = this._enumName;
    }
    if (this._enumValues !== undefined) {
      schema.enumValues = this._enumValues;
    }
    if (this._fieldName !== undefined) {
      schema.fieldName = this._fieldName;
    }

    return schema;
  }
}
