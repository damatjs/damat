# ORM Package Architecture Review

**Date:** May 16, 2026  
**Reviewer:** Architecture Analysis  
**Scope:** `packages/orm/*`

---

## Executive Summary

This review evaluates the current structure of the `@damatjs/orm` monorepo packages. The primary finding is that `orm-model` handles more responsibility than appropriate, while other packages are well-structured. Additionally, with the planned removal of MikroORM, `orm-connector` requires significant restructuring.

### Key Findings

| Package | Lines | Current State | Recommendation |
|---------|-------|---------------|----------------|
| `orm-model` | ~8000 | Handles too many concerns | **Split** into 3 packages |
| `orm-migration` | ~1800 | Well-structured | No changes needed |
| `orm-connector` | ~900 | MikroORM wrapper | **Rewrite** as connection manager |
| `orm-processor` | ~1660 | Well-focused | No changes needed |
| `orm-pg` | ~940 | Well-focused | No changes needed |

---

## Package-by-Package Analysis

### 1. `packages/orm/model` — Needs Restructuring

**Current Responsibilities:**

| Module | Responsibility | Lines |
|--------|----------------|-------|
| `properties/` | Column builders, indexes, constraints, foreign keys, relation builders | ~2500 |
| `schema/` | Model definition (`ModelDefinition`), module schema conversion | ~400 |
| `query/` | SQL query builders (SELECT, INSERT, UPDATE, DELETE, UPSERT), `ModelAccessor` | ~1500 |
| `codegen/` | TypeScript type generation from schemas | ~600 |
| `snapshot/` | Load/save JSON schema snapshots | ~60 |
| `errors/` | ORM error classes | ~200 |

**Problems Identified:**

1. **Query Builders (`query/`)** — Generate SQL, more aligned with a "query" concern than "model definition"
2. **Codegen (`codegen/`)** — Dev-time/CLI concern, ships to all runtime consumers unnecessarily
3. **Errors (`errors/`)** — Contains `ConnectionError`, `TransactionError`, `MigrationError` that belong in their respective packages

**Recommended Split:**

```
@damatjs/orm-model       → Schema definition only
                           ├── properties/  (column, relation, index builders)
                           ├── schema/      (ModelDefinition, toModuleSchema)
                           ├── types/       (all type definitions)
                           └── snapshot/    (JSON snapshot load/save)

@damatjs/orm-query       → SQL query builders (NEW)
                           ├── select.ts
                           ├── insert.ts
                           ├── update.ts
                           ├── delete.ts
                           ├── upsert.ts
                           ├── base.ts
                           ├── accessor/    (ModelAccessor)
                           └── helpers.ts

@damatjs/orm-codegen     → TypeScript type generation (NEW)
                           ├── generator.ts
                           ├── columnToTsType.ts
                           ├── defaults.ts
                           └── utils/
```

**Benefits:**

- Smaller bundle for users who only need schema definition
- Codegen stays as dev dependency
- Clearer package boundaries
- Query builders can evolve independently

---

### 2. `packages/orm/migration` — Well-Structured

**Current Structure:**

```
src/
├── cli/           # CLI commands (up, status, create, list, help)
├── executor/      # Running migrations, bootstrap
├── generator/     # Creating initial and diff migrations
├── discovery/     # Finding modules and models on disk
├── tracker/       # Database migration tracking table
├── logger/        # CLI logging wrapper
└── types/         # CLI/config/migration types
```

**Assessment:** Each module has clear, focused responsibility. Proper separation from `orm-processor` (schema diffing).

**Minor Observations:**

| Item | Note |
|------|------|
| Bootstrap SQL | `generate_id()` PostgreSQL function could move to `orm-pg` as reusable utility |
| Logger wrapper | Thin wrapper around `@damatjs/logger` — acceptable for convenience |

---

### 3. `packages/orm/connector` — Requires Rewrite

**Current State:** MikroORM wrapper

| File | Purpose | MikroORM Dependency |
|------|---------|---------------------|
| `createConnection.ts` | `MikroORM.init()` | Direct |
| `createOrmConfig.ts` | Builds MikroORM `Options` | Direct |
| `wrapOrmConnection.ts` | Wraps `MikroORM` instance | Direct |
| `types/connection.ts` | `DatabaseConnection.orm: MikroORM` | Direct |

**With MikroORM Removal:** Package becomes obsolete in current form.

**Two Options Considered:**

#### Option A: Delete `orm-connector` entirely, merge into `orm-pg`

**Pros:**
- Fewer packages to maintain
- No indirection
- `orm-pg` already handles pools, transactions, execution

**Cons:**
- `orm-pg` grows in responsibility
- Blurs line between "execute queries" and "manage connections"

#### Option B: Rewrite as Pure Connection Manager (Recommended)

**Pros:**
- Single responsibility: connection lifecycle only
- `orm-pg` stays focused on query execution
- Clear separation of concerns
- Could support multiple database types in future

**Cons:**
- Another package to maintain
- Additional dependency layer

**Recommended Structure:**

```
@damatjs/orm-connector  (~200-300 lines)
├── src/
│   ├── pool.ts         # Pool singleton management
│   ├── init.ts         # initPool(config) → Pool
│   ├── getPool.ts      # getPool() → Pool
│   ├── closePool.ts    # closePool()
│   ├── health.ts       # isHealthy() → boolean
│   ├── config.ts       # Environment config parsing
│   └── types.ts        # Connection types
└── package.json
```

---

### 4. `packages/orm/processor` — Well-Structured

**Current Structure:**

```
src/
├── diff/              # Schema diffing (~500 lines)
│   ├── diffSchemas.ts
│   ├── tables.ts
│   ├── columns.ts
│   ├── enums.ts
│   ├── indexes.ts
│   ├── foreignKeys.ts
│   └── priority.ts
├── sqlGenerator/      # SQL generation (~600 lines)
│   ├── generateMigration/
│   ├── tables.ts
│   ├── columns.ts
│   ├── enums.ts
│   └── changeSql.ts
└── types/             # Diff types (~150 lines)
```

**Assessment:** Clean separation of concerns:
- Computes schema differences (pure functions, no I/O)
- Generates SQL from diffs (PostgreSQL-specific)
- Properly separated from `orm-migration`

**No changes needed.**

---

### 5. `packages/orm/pg` — Well-Structured

**Current Structure:**

```
src/
├── client.ts      # PgModelClient (~330 lines)
├── executor.ts    # pgSelect, pgInsert, etc. (~230 lines)
├── types.ts       # Result types (~130 lines)
├── config.ts      # Pool configuration (~100 lines)
└── logger.ts      # Query logging (~90 lines)
```

**Assessment:** Clear responsibility — PostgreSQL execution layer.

**What's Working Well:**

- Type-safe results via `T` generic
- Transaction support (`pgTransaction()`, `PgModelClient.transaction()`)
- Clean `PgModelClient` ergonomic API
- Query logging with slow query detection

**Minor Observations:**

| Item | Note |
|------|------|
| `config.ts` types | `PoolClient` and `ConnectionPool` are re-defined here but also come from `@damatjs/deps/pg` |
| Optional improvement | Import types directly from pg instead of redefining |

**Potential Addition:** Move `generate_id()` from `migration/bootstrap.ts` here as a reusable database utility.

---

## Proposed Final Architecture

```
packages/orm/
├── model/           # Schema definition only (after split)
│   ├── properties/
│   ├── schema/
│   ├── types/
│   └── snapshot/
│
├── query/           # NEW — SQL query builders
│   ├── select.ts
│   ├── insert.ts
│   ├── update.ts
│   ├── delete.ts
│   ├── upsert.ts
│   ├── base.ts
│   └── accessor/
│
├── codegen/         # NEW — TypeScript type generation (dev dependency)
│   ├── generator.ts
│   ├── columnToTsType.ts
│   └── utils/
│
├── connector/       # REWRITTEN — Connection management only
│   ├── pool.ts
│   ├── init.ts
│   ├── health.ts
│   └── config.ts
│
├── pg/              # PostgreSQL execution (unchanged)
│   ├── client.ts
│   ├── executor.ts
│   └── logger.ts
│
├── processor/       # Schema diff + SQL generation (unchanged)
│   ├── diff/
│   └── sqlGenerator/
│
└── migration/       # CLI + migration management (unchanged)
    ├── cli/
    ├── executor/
    ├── generator/
    ├── discovery/
    └── tracker/
```

---

## Dependency Graph (After Restructuring)

```
                    ┌─────────────┐
                    │  orm-model  │
                    │  (schemas)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ orm-query │    │orm-codegen│    │orm-processor│
    │           │    │  (dev)    │    │           │
    └─────┬─────┘    └───────────┘    └─────┬─────┘
          │                                  │
          ▼                                  │
    ┌───────────┐                           │
    │   orm-pg  │◄──────────────────────────┘
    │(execution)│
    └─────┬─────┘
          │
          ▼
    ┌───────────────┐
    │ orm-connector │
    │(connections)  │
    └───────────────┘

    ┌─────────────┐
    │ orm-migration│
    │ (CLI tool)  │
    └──────┬──────┘
           │
           ▼
    Uses: orm-model, orm-processor, orm-pg
```

---

## Implementation Priority

### Phase 1: Remove MikroORM
1. Rewrite `orm-connector` as pure connection manager
2. Ensure `orm-pg` works standalone
3. Update `orm-migration` to use new connector/pg

### Phase 2: Split orm-model
1. Create `@damatjs/orm-query` package
2. Move query builders and ModelAccessor
3. Create `@damatjs/orm-codegen` package
4. Move codegen utilities
5. Update all imports across packages

### Phase 3: Cleanup
1. Move error classes to appropriate packages
2. Consider moving `generate_id()` to `orm-pg`
3. Update documentation
4. Update `@damatjs/orm` main package exports

---

## Questions Resolved

| Question | Decision |
|----------|----------|
| Should `orm-connector` be deleted or merged? | **Rewrite** as pure connection manager |
| Should codegen be separate package? | **Yes** — dev-only, should not ship to runtime |
| Should query builders be separate? | **Yes** — clearer boundaries, smaller bundles |
| Should `generate_id()` move from migration? | **Consider** — could be utility in `orm-pg` |

---

## Appendix: Error Class Distribution

Current `orm-model/errors` contains errors that should live elsewhere:

| Error Class | Current Location | Recommended Location |
|-------------|-------------------|----------------------|
| `OrmError` | orm-model | Keep in orm-model or shared errors |
| `ConnectionError` | orm-model | Move to `orm-connector` |
| `QueryError` | orm-model | Move to `orm-pg` |
| `ModelError` | orm-model | Keep in `orm-model` |
| `ValidationError` | orm-model | Keep in `orm-model` |
| `NotFoundError` | orm-model | Keep in `orm-model` |
| `DuplicateError` | orm-model | Keep in `orm-model` |
| `TransactionError` | orm-model | Move to `orm-pg` or `orm-connector` |
| `MigrationError` | orm-model | Move to `orm-migration` |

---

## Conclusion

The ORM packages are generally well-architected, with `orm-migration`, `orm-processor`, and `orm-pg` demonstrating good separation of concerns. The primary areas for improvement are:

1. **Splitting `orm-model`** into schema definition, query building, and codegen
2. **Rewriting `orm-connector`** after MikroORM removal
3. **Distributing errors** to their appropriate packages

These changes will result in a cleaner, more maintainable architecture with clearer package boundaries and smaller bundle sizes for consumers who don't need all features.
