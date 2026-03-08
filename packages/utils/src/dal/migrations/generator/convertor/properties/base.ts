import { ColumnSchema, ColumnType } from "../../types/properties/column";

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

/**
 * ID column builder with prefix support
 */
export class IdColumnBuilder extends ColumnBuilder {
  protected _prefix?: string;

  constructor(options?: { prefix?: string }) {
    super("text");
    if (options?.prefix !== undefined) {
      this._prefix = options.prefix;
    }
    // ID columns default to not nullable
    this._nullable = false;
  }

  toSchema(): ColumnSchema {
    // Build schema with prefix-based default if provided
    if (this._prefix) {
      this._default = `generate_id('${this._prefix}')`;
    }
    return super.toSchema();
  }
}

/**
 * Text column builder
 */
export class TextColumnBuilder extends ColumnBuilder {
  constructor() {
    super("text");
  }
}

/**
 * Varchar column builder with length support
 */
export class VarcharColumnBuilder extends ColumnBuilder {
  constructor(length?: number) {
    super("varchar");
    if (length !== undefined) {
      this._length = length;
    }
  }

  /** Set max length */
  length(len: number): this {
    this._length = len;
    return this;
  }
}

/**
 * Number column builder (integer)
 */
export class NumberColumnBuilder extends ColumnBuilder {
  constructor() {
    super("integer");
  }

  /** Use bigint instead of integer */
  bigInt(): this {
    this._type = "bigint";
    return this;
  }

  /** Use smallint instead of integer */
  smallInt(): this {
    this._type = "smallint";
    return this;
  }

  /** Use serial (auto-incrementing) */
  serial(): this {
    this._type = "serial";
    this._autoincrement = true;
    return this;
  }

  /** Use bigserial (auto-incrementing bigint) */
  bigSerial(): this {
    this._type = "bigserial";
    this._autoincrement = true;
    return this;
  }
}

/**
 * Decimal/Numeric column builder
 */
export class DecimalColumnBuilder extends ColumnBuilder {
  constructor(precision?: number, scale?: number) {
    super("decimal");
    if (precision !== undefined) {
      this._length = precision;
    }
    if (scale !== undefined) {
      this._scale = scale;
    }
  }

  /** Set precision */
  precision(p: number): this {
    this._length = p;
    return this;
  }

  /** Set scale */
  scale(s: number): this {
    this._scale = s;
    return this;
  }
}

/**
 * Boolean column builder
 */
export class BooleanColumnBuilder extends ColumnBuilder {
  constructor() {
    super("boolean");
  }
}

/**
 * Timestamp column builder
 */
export class TimestampColumnBuilder extends ColumnBuilder {
  constructor(options?: { withTimezone?: boolean }) {
    super(options?.withTimezone ? "timestamptz" : "timestamp");
  }

  /** Use timestamp with timezone */
  withTimezone(): this {
    this._type = "timestamptz";
    return this;
  }

  /** Set default to current timestamp */
  defaultNow(): this {
    this._default = "now()";
    return this;
  }
}

/**
 * Date column builder
 */
export class DateColumnBuilder extends ColumnBuilder {
  constructor() {
    super("date");
  }

  /** Set default to current date */
  defaultNow(): this {
    this._default = "CURRENT_DATE";
    return this;
  }
}

/**
 * Time column builder
 */
export class TimeColumnBuilder extends ColumnBuilder {
  constructor() {
    super("time");
  }
}

/**
 * JSON column builder
 */
export class JsonColumnBuilder extends ColumnBuilder {
  constructor(options?: { binary?: boolean }) {
    super(options?.binary ? "jsonb" : "json");
  }

  /** Use JSONB (binary JSON) for better indexing */
  binary(): this {
    this._type = "jsonb";
    return this;
  }
}

/**
 * Enum column builder
 */
export class EnumColumnBuilder extends ColumnBuilder {
  constructor(enumNameOrValues: string | string[]) {
    super("enum");
    if (Array.isArray(enumNameOrValues)) {
      this._enumValues = enumNameOrValues;
    } else {
      this._enumName = enumNameOrValues;
    }
  }

  /** Set enum name */
  enumName(name: string): this {
    this._enumName = name;
    return this;
  }

  /** Set enum values */
  values(vals: string[]): this {
    this._enumValues = vals;
    return this;
  }
}

/**
 * UUID column builder
 */
export class UuidColumnBuilder extends ColumnBuilder {
  constructor() {
    super("uuid");
  }

  /** Set default to generate UUID */
  defaultGenerate(): this {
    this._default = "gen_random_uuid()";
    return this;
  }
}

/**
 * Bytea (binary) column builder
 */
export class ByteaColumnBuilder extends ColumnBuilder {
  constructor() {
    super("bytea");
  }
}
