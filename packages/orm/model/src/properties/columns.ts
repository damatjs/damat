import { BelongsTo, belongsTo } from "./relation/belongsToBuilder";
import { HasMany, hasMany } from "./relation/hasManyBuilder";
import { HasOne, hasOne } from "./relation/hasOneBuilder";
import { BooleanColumnBuilder } from "./column/boolean";
import { ByteaColumnBuilder } from "./column/bytea";
import {
  TextColumnBuilder,
  CharacterVaryingColumnBuilder,
  CharacterColumnBuilder,
} from "./column/text";
import {
  DateColumnBuilder,
  TimeColumnBuilder,
  TimestampColumnBuilder,
  IntervalColumnBuilder,
} from "./column/time";
import { EnumColumnBuilder } from "./column/enum";
import { IdColumnBuilder } from "./column/id";
import { JsonColumnBuilder } from "./column/json";
import {
  IntegerColumnBuilder,
  NumericColumnBuilder,
  RealColumnBuilder,
  DoublePrecisionColumnBuilder,
  MoneyColumnBuilder,
} from "./column/number";
import { UuidColumnBuilder } from "./column/uuid";
import { VectorColumnBuilder } from "./column/vector";
import { EnumBuilder } from "./enum/base";
import {
  RelationOptions
} from "@damatjs/orm-type";
import { IndexBuilder } from "./indexes";
import { ConstraintBuilder } from "./constraints";
import { ModelTarget } from '@/utils';

// Column and relation builders
export const columns = {
  /** Create an ID column (text with optional prefix for ID generation) */
  id(options?: { prefix?: string }): IdColumnBuilder {
    return new IdColumnBuilder(options);
  },

  /** Create a boolean column */
  boolean(): BooleanColumnBuilder {
    return new BooleanColumnBuilder();
  },

  /** Create a timestamp column */
  timestamp(options?: { withTimezone?: boolean }): TimestampColumnBuilder {
    return new TimestampColumnBuilder(options);
  },

  /** Create a date column */
  date(): DateColumnBuilder {
    return new DateColumnBuilder();
  },

  /** Create a time column */
  time(): TimeColumnBuilder {
    return new TimeColumnBuilder();
  },

  /** Create a JSON/JSONB column */
  json(options?: { binary?: boolean }): JsonColumnBuilder {
    return new JsonColumnBuilder(options);
  },

  /** Create text columns */
  text(): TextColumnBuilder {
    return new TextColumnBuilder();
  },

  /** Create character varying column with optional max length */
  varchar(length?: number): CharacterVaryingColumnBuilder {
    const builder = new CharacterVaryingColumnBuilder();
    if (length !== undefined) builder.length(length);
    return builder;
  },

  /** Create a fixed-length character column */
  char(length?: number): CharacterColumnBuilder {
    const builder = new CharacterColumnBuilder();
    if (length !== undefined) builder.length(length);
    return builder;
  },

  /** Create an enum column */
  enum(enumType: EnumBuilder): EnumColumnBuilder {
    return new EnumColumnBuilder(enumType);
  },

  /** Create a UUID column */
  uuid(): UuidColumnBuilder {
    return new UuidColumnBuilder();
  },

  /** Create a bytea (binary) column */
  bytea(): ByteaColumnBuilder {
    return new ByteaColumnBuilder();
  },

  /** Create an integer column */
  integer(): IntegerColumnBuilder {
    return new IntegerColumnBuilder();
  },

  /** Create a numeric/decimal column with optional precision and scale */
  numeric(precision?: number, scale?: number): NumericColumnBuilder {
    return new NumericColumnBuilder(precision, scale);
  },

  /** Create a real (single-precision floating-point) column */
  real(): RealColumnBuilder {
    return new RealColumnBuilder();
  },

  /** Create a double precision (8-byte floating-point) column */
  doublePrecision(): DoublePrecisionColumnBuilder {
    return new DoublePrecisionColumnBuilder();
  },

  /** Create a money (currency amount) column */
  money(): MoneyColumnBuilder {
    return new MoneyColumnBuilder();
  },

  /** Create a JSON/JSONB column */
  jsonb(): JsonColumnBuilder {
    return new JsonColumnBuilder({ binary: true });
  },

  /** Create an interval (time span) column */
  interval(): IntervalColumnBuilder {
    return new IntervalColumnBuilder();
  },

  /** Create a vector column (real[] with fixed dimensions, for embeddings) */
  vector(dimensions: number): VectorColumnBuilder {
    return new VectorColumnBuilder(dimensions);
  },

  // ─── Relation builders ──────────────────────────────────────────────────────

  /**
   * Create a BelongsTo relation (creates a FK column on this table).
   *
   * Pass the target model directly or as a lazy thunk for circular references:
   *   - `columns.belongsTo(UserSchema)`            — direct
   *   - `columns.belongsTo(() => UserSchema)`       — lazy (breaks circular init)
   *
   * Chain `.link()`, `.onDelete()`, `.onUpdate()`, `.nullable()`, `.unique()`,
   * `.indexed()`, `.deferrable()`, `.constraint()` as needed.
   *
   * ```ts
   * author: columns.belongsTo(UserSchema)
   *   .link({ foreignKey: "author_id" })
   *   .onDelete("CASCADE")
   *   .indexed()
   * ```
   */
  belongsTo(target: ModelTarget, options?: RelationOptions): BelongsTo {
    return belongsTo(target, options);
  },

  /**
   * Create a HasMany relation (no column — inverse side of a 1:N).
   *
   * Pass the target model directly or as a lazy thunk:
   *   - `columns.hasMany(PostSchema, { mappedBy: "author" })`
   *   - `columns.hasMany(() => PostSchema).mappedBy("author")`  — lazy
   *
   * ```ts
   * posts: columns.hasMany(PostSchema).mappedBy("author")
   * ```
   */
  hasMany(target: ModelTarget, options?: RelationOptions): HasMany {
    return hasMany(target, options);
  },

  /**
   * Create a HasOne relation (no column — inverse side of a 1:1).
   *
   * Pass the target model directly or as a lazy thunk:
   *   - `columns.hasOne(ProfileSchema, { mappedBy: "user" })`
   *   - `columns.hasOne(() => ProfileSchema).mappedBy("user")`  — lazy
   *
   * ```ts
   * profile: columns.hasOne(ProfileSchema).mappedBy("user")
   * ```
   */
  hasOne(target: ModelTarget, options?: RelationOptions): HasOne {
    return hasOne(target, options);
  },

  indexes(name?: string): IndexBuilder {
    return new IndexBuilder(name);
  },

  constrains(name?: string): ConstraintBuilder {
    return new ConstraintBuilder(name);
  },
};
