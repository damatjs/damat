# Column builders

Covers `ColumnBuilder` (the base), every concrete column type, the `columns`
factory object, and `EnumBuilder`. All live under
`src/properties/column/`, `src/properties/columns.ts`, and
`src/properties/enum/`.

## The `columns` factory (`src/properties/columns.ts`)

`columns` is a plain object whose methods are the public DSL surface. Each column
method returns a fresh builder instance; relation methods delegate to the relation
factories; `indexes()` / `constrains()` return index/constraint builders.

```ts
columns.id({ prefix })          // IdColumnBuilder      (text PK, generate_id default)
columns.boolean()               // BooleanColumnBuilder
columns.integer()               // IntegerColumnBuilder  (+ .bigInt/.smallInt/.serial/…)
columns.numeric(p?, s?)         // NumericColumnBuilder
columns.real()                  // RealColumnBuilder
columns.doublePrecision()       // DoublePrecisionColumnBuilder
columns.money()                 // MoneyColumnBuilder
columns.text()                  // TextColumnBuilder
columns.varchar(len?)           // CharacterVaryingColumnBuilder (applies .length(len) if given)
columns.char(len?)              // CharacterColumnBuilder
columns.timestamp({withTimezone?}) // TimestampColumnBuilder
columns.date()                  // DateColumnBuilder
columns.time()                  // TimeColumnBuilder
columns.interval()              // IntervalColumnBuilder
columns.json({binary?})         // JsonColumnBuilder
columns.jsonb()                 // JsonColumnBuilder({binary:true})
columns.uuid()                  // UuidColumnBuilder
columns.bytea()                 // ByteaColumnBuilder
columns.enum(EnumBuilder)       // EnumColumnBuilder
columns.vector(dims)            // VectorColumnBuilder
columns.belongsTo / hasMany / hasOne   // relation builders (see relations.md)
columns.indexes(name?) / columns.constrains(name?)  // index/constraint builders
```

> There is no first-class geometric/network/range column builder even though
> `ColumnType` lists those SQL types — they are reachable only by constructing a
> `ColumnBuilder` directly, or via `pgTypeToTsBase` for type emission. Most apps
> never need them. If you add a friendly factory, follow the one-method-per-type
> pattern here.

## `ColumnBuilder` (`src/properties/column/base.ts`)

The base class all column types extend. Protected state plus a fluent API.

```ts
class ColumnBuilder {
  constructor(type: ColumnType);

  primaryKey(): this;
  nullable(): this;
  unique(): this;
  default(value: string | number | boolean): this; // string values are auto-single-quoted
  defaultRaw(expression: string): this; // raw SQL expression, no quoting
  array(): this;
  fieldName(name: string): this; // DB column name ≠ property name
  _setName(name: string): this; // internal: set by ModelDefinition

  toSchema(): ColumnSchema;
  toTsType(): string;
}
```

Behavior notes:

- **`default()` quoting:** strings become `'value'`; numbers/booleans are
  stringified bare. For SQL expressions (`now()`, `gen_random_uuid()`) use
  `defaultRaw()` (or a type-specific `.defaultNow()` / `.defaultGenerate()`).
- **`_name` starts empty.** `ModelDefinition.toTableSchema()` calls
  `_setName(propName)` before `toSchema()`. A builder used outside a model has an
  empty `name`.
- **`toSchema()`** always emits `name`, `type`, `primaryKey`, `nullable`,
  `unique`, `array`, `autoincrement`; it adds `default`, `length`, `scale`,
  `enum`, `fieldName` only when set.

### `toTsType()` rules

`toTsType()` builds the TypeScript type string for the column:

1. Base type = `pgTypeToTsBase(type)`, except enum columns use the stored enum
   type name (`_enumTsType`) directly, bypassing the map.
2. Array wrap: `Array<base>` when `.array()`.
3. Nullability: append `| null`. If the base is a union (e.g. an object literal
   that itself contains `|`) and the column is nullable but not an array, it is
   parenthesised: `(base) | null`. The union-detection (`baseNeedsParens`) scans
   for a top-level `|` outside `{}`/`<>` nesting.

Examples (from the source doc-comment):

```
integer                  → number
integer + nullable       → number | null
text + array             → Array<string>
text + array + nullable  → Array<string> | null
enum(Status)             → Status
point                    → { x: number; y: number }
point + nullable         → ({ x: number; y: number }) | null
```

## Concrete column types

Most subclasses just call `super("<type>")`. The ones with extra behavior:

### `IdColumnBuilder` (`id.ts`)

```ts
columns.id({ prefix: "usr" }).primaryKey();
```

- SQL type `text`, defaults to **not nullable**.
- In `toSchema()`, if a `prefix` was given it sets the default to
  `generate_id('<prefix>')` (a DB-side ID generator). Without a prefix, no
  default is emitted.

### `IntegerColumnBuilder` (`number.ts`)

Starts as `integer`; chainable mutators switch the SQL type:

```ts
.bigInt()      // -> "bigint"
.smallInt()    // -> "smallint"
.serial()      // -> "serial",      sets autoincrement
.bigSerial()   // -> "bigserial",   sets autoincrement
.smallSerial() // -> "smallserial", sets autoincrement
```

The `serial` variants set `_autoincrement = true` (surfaced in `ColumnSchema`).

### `NumericColumnBuilder` (`number.ts`)

`columns.numeric(precision?, scale?)`; precision maps to `length`, scale to
`scale`. Also chainable: `.precision(p)`, `.scale(s)`. `RealColumnBuilder`,
`DoublePrecisionColumnBuilder`, `MoneyColumnBuilder` are plain wrappers around
`real` / `double precision` / `money`.

### Text types (`text.ts`)

`TextColumnBuilder` (`text`), `CharacterVaryingColumnBuilder`
(`character varying`, `.length(n)`), `CharacterColumnBuilder` (`character`,
`.length(n)`). `columns.varchar(n)` / `columns.char(n)` apply `.length(n)` for you
when an argument is passed.

### Time types (`time.ts`)

`TimestampColumnBuilder` (`{withTimezone}` constructor + `.withTimezone()` /
`.withoutTimezone()` + `.defaultNow()` → `now()`), `DateColumnBuilder`
(`.defaultNow()` → `CURRENT_DATE`), `TimeColumnBuilder` (tz toggle),
`IntervalColumnBuilder`.

### `JsonColumnBuilder` (`json.ts`)

`columns.json({binary})` picks `json` vs `jsonb`; `columns.jsonb()` forces
`jsonb`; `.binary()` switches an existing builder to `jsonb`.

### `UuidColumnBuilder` (`uuid.ts`)

`columns.uuid()` with `.defaultGenerate()` → `gen_random_uuid()`.

### `EnumColumnBuilder` (`enum.ts`)

```ts
const Status = new EnumBuilder(["a", "b"]).name("Status");
columns.enum(Status);
```

At construction it copies the enum's name into both `_enum` (the PG type
reference in `ColumnSchema.enum`) and `_enumTsType` (used by `toTsType()`). It
keeps **no** reference to the `EnumBuilder` afterwards — like a PG column
referencing a named `CREATE TYPE`.

### `VectorColumnBuilder` (`vector.ts`)

```ts
columns.vector(1536); // real[] with length=1536
columns.vector(768).dimensions(512);
```

SQL type `real`, always `array = true`, with the dimension stored in `length`.
`.dimensions(d)` updates both the internal count and `length`; `toSchema()`
re-syncs `length` to the current dimension count.

## `EnumBuilder` (`src/properties/enum/base.ts`)

Declares a named PG enum once; columns reference it by name.

```ts
class EnumBuilder {
  constructor(values: string[]);
  name(name: string): this; // PG type name AND TS alias name
  toSchema(): EnumSchema; // { name, values }
  toTsTypeName(): string; // "Status"
  toTsTypeDeclaration(): string; // "export type Status = 'a' | 'b';"
}
```

`toTsTypeDeclaration()` uses `enumTypeToTsBase(values)` to build the union; emit
it once per schema file. Columns reference `toTsTypeName()` so the union is not
repeated.

## Edge cases & gotchas

- A builder used outside a `model(...)` has an empty `name` until `_setName` is
  called — `toSchema()`/`toTsType()` will reflect that.
- `default()` always quotes strings; pass already-quoted/expression defaults via
  `defaultRaw()` to avoid double quoting.
- Enum **values** never reach `ColumnSchema` — only the name. The values live on
  the module-level `EnumSchema` you pass to `toModuleSchema({ enums })`. If you
  forget to register the enum at module level, the type name still appears on the
  column but no `CREATE TYPE` is described.

## Extending with a new column type

1. Add the SQL literal to `ColumnType` in `@damatjs/orm-type` and a case in
   `pgTypeToTsBase` (`src/utils/pgTypeToTsBase.ts`).
2. Create `src/properties/column/<name>.ts` extending `ColumnBuilder`
   (`super("<type>")`), add any type-specific mutators.
3. Export it from `src/properties/column/index.ts`.
4. Add a factory method to the `columns` object in
   `src/properties/columns.ts`.
5. Cover it in `src/tests/columns.test.ts` and regenerate the snapshot if it
   appears in a fixture.
