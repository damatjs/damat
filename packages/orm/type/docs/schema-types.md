# Schema snapshot types (`src/model/`)

These types describe the serialized, JSON-able form of a Damat schema. They are
produced by the fluent builders in `@damatjs/orm-model` and consumed by the
registry (`@damatjs/orm-core`), the migration/DDL engine, and
`@damatjs/schema-codegen`. Editing
anything here ripples through every one of those packages.

All types in this group are exported from `src/model/index.ts` and re-exported by
the package root.

## `ColumnType` and `ColumnSchema` (`column.ts`)

`ColumnType` is a string-literal union of ~80 PostgreSQL type names, grouped by
family (numeric, monetary, character, binary, date/time, boolean, enum,
geometric, network, bit string, text-search, UUID, XML, JSON, range, multirange,
object-identifier/system). The literals are the **exact SQL names** —
`"character varying"`, `"timestamp without time zone"`, `"double precision"`,
`"bit varying"`, etc.

```ts
export interface ColumnSchema {
  name: string;
  type: ColumnType;
  primaryKey?: boolean;
  length?: number; // varchar/char length, numeric precision, vector dimensions
  scale?: number; // numeric digits after the decimal point
  nullable: boolean; // required — always set by builders
  default?: any; // default value *expression* (already SQL-quoted)
  unique?: boolean;
  enum?: string; // named enum type reference (matches EnumSchema.name)
  array?: boolean; // array column (e.g. text[])
  fieldName?: string; // DB column name when it differs from the property name
  autoincrement?: boolean; // serial/bigserial/smallserial
}
```

Notes / gotchas:

- `length` is overloaded: it carries varchar/char length, numeric precision, _and_
  the dimension count for vector columns. `scale` is numeric-only.
- `default` is an expression string (e.g. `"now()"`, `"generate_id('usr')"`,
  `"'active'"`). String literal defaults arrive already single-quoted from the
  builder — do not re-quote when generating DDL.
- `enum` holds the _name_ of an `EnumSchema`, not the values. The values live on
  the `EnumSchema` declared at module level.

## `TableSchema` (`table.ts`)

```ts
export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes?: IndexSchema[];
  foreignKeys?: ForeignKeySchema[];
  constraints?: ConstraintSchema[];
  relations?: RelationSchema[]; // ORM metadata only — no DB artifact
}
```

`relations` is pure ORM metadata (the relationship graph) and produces no DDL.
`toModuleSchema()` in `@damatjs/orm-model` strips it out into the module-level
`relationships` array, which is why `ModuleSchema.tables` uses
`Omit<TableSchema, "relations">`.

## `ModuleSchema` (`module.ts`)

```ts
export interface ModuleSchema {
  schema?: string; // PG schema name, default "public"
  moduleName: string;
  tables: Omit<TableSchema, "relations">[];
  enums?: EnumSchema[];
  relationships?: RelationSchema[]; // all relations hoisted from every table
}
```

This is the top-level snapshot for a module (a group of related tables). It is
what gets serialized to `module.snap.json`, fed to the migration diff engine, and
passed to schema generation.

## `EnumSchema` (`enum.ts`)

```ts
export interface EnumSchema {
  schema?: string;
  name: string; // CREATE TYPE <name> AS ENUM (...)
  values: string[];
}
```

## `ForeignKey*` (`foreignKey.ts`)

```ts
export type ForeignKeyAction =
  "CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION";

export type ForeignKeySchemaMatch = "SIMPLE" | "FULL";

export type ForeignKeyType = { name: string; type: ColumnType };

export interface ForeignKeySchema {
  name: string;
  columns: ForeignKeyType[]; // FK columns on THIS table (composite-aware)
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: ForeignKeyAction;
  onUpdate?: ForeignKeyAction;
  deferrable?: boolean;
  initiallyDeferred?: boolean;
  match?: ForeignKeySchemaMatch;
  unique?: boolean; // 1:1 marker
  nullable?: boolean;
  indexed?: boolean;
}
```

Key point: `columns` is `ForeignKeyType[]` (each carries its own SQL type), not a
bare `string[]`. This lets the DDL generator emit the FK column with the correct
type, and supports composite keys by construction (everything is an array).

## Constraints (`constrain.ts`)

```ts
export type ConstraintType = "unique" | "primary_key" | "check" | "exclude";

export interface Constraint {
  name?: string;
  type: ConstraintType;
  where?: string; // partial constraint condition
  deferrable?: boolean;
  initiallyDeferred?: boolean;
}
```

The four concrete shapes (`UniqueConstraint`, `PrimaryKeyConstraint`,
`CheckConstraint`, `ExcludeConstraint`) narrow `type` and add their own payload
(`columns`, `condition`, or `expressions` + `indexType`). `ConstraintSchema` is
their discriminated union. Narrow on `.type` before accessing kind-specific
fields.

## Indexes (`indexType.ts`)

```ts
export type IndexType = "btree" | "hash" | "gin" | "gist" | "brin";

export interface IndexColumn {
  name: string;
  order?: "ASC" | "DESC";
}

export interface IndexSchema {
  name?: string;
  columns: (string | IndexColumn)[]; // strings are normalised to IndexColumn
  unique?: boolean;
  type?: IndexType;
  where?: string; // partial index
  concurrently?: boolean; // CREATE INDEX CONCURRENTLY
}
```

`columns` accepts bare strings _or_ `IndexColumn` objects; the model layer's
`cleanupIndexSchema` normalises strings to `{ name }`.

## Relations (`relation.ts`)

This file holds both the snapshot relation type and the builder option payloads.

```ts
export type RelationType = "belongsTo" | "hasMany" | "hasOne";

// Builder option payloads (inputs to the @damatjs/orm-model fluent API):
export interface RelationOptions {
  mappedBy?: string;
}
export interface LinkConfig {
  name?: string;
  foreignKey?: string | string[] | ForeignKeyType | ForeignKeyType[];
  reference?: string | string[];
}
export interface ConstraintOptions {
  name?: string;
  onDelete?: ForeignKeyAction;
  onUpdate?: ForeignKeyAction;
  deferrable?: boolean;
  initiallyDeferred?: boolean;
  match?: ForeignKeySchemaMatch;
}

// Snapshot relation record (module-level metadata):
export interface RelationSchema {
  fromTable: string; // source table
  from: string; // source property name
  to: string; // target table
  type: RelationType;
  mappedBy?: string[]; // inverse property name(s) on the other side
  linkedBy?: string[]; // FK column name(s) — populated on belongsTo only
  rule?: {
    onDelete?: ForeignKeyAction;
    onUpdate?: ForeignKeyAction;
    deferrable?: boolean;
    initiallyDeferred?: boolean;
    match?: ForeignKeySchemaMatch;
  };
}
```

`RelationSchema` is _not_ the FK constraint record — that is `ForeignKeySchema`.
`RelationSchema` is the graph view: who points at whom, by which property, via
which FK column. `linkedBy` only appears on `belongsTo` entries (the side that
physically owns the FK). The TODO comment in source flags that this record is
slightly repetitive — leave the shape stable; downstream validators
(`checkBelongsToSchema` / `checkInverseSchema` in orm-model) match on `type`,
`fromTable`, and `to`.

## Editing checklist

- Add a `ColumnType` literal → add a `pgTypeToTsBase` case in orm-model.
- Change `ColumnSchema`/`TableSchema`/`ModuleSchema` → rebuild orm-model
  (`toSchema`/`toTableSchema`/`toModuleSchema`) and the migration DDL generator.
- Change `RelationSchema` → update orm-model's `toRelationSchema()` emitters and
  the schema-level validators.
- Regenerate downstream snapshots if a shape changes (orm-model has
  `bun run snapshot`).
