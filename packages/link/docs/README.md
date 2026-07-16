# @damatjs/link — internals

This package implements cross-module links. It deliberately reuses the existing
ORM and service machinery: a junction table is just an ordinary `ModelDefinition`,
and the link module is just a `defineModule` instance, so migrations, snapshots,
and codegen need **no** special-casing.

## Module map

| File                  | Responsibility                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`            | `LinkEndpoint`, `ResolvedEndpoint` (incl. the resolved `table`), `LinkOptions`, `LinkDefinition`, row/model refs.                                                                                                                              |
| `naming.ts`           | `defaultPivotTable` + `pivotColumns` — derive names from each side's REAL table, singularized via the ORM's `removeLastS` rule (segment-collapsing, collision-safe columns, 63-byte clamp).                                                    |
| `pivot.ts`            | `buildPivotModel` — constructs the junction `ModelDefinition` with the orm-model DSL (id + 2 FK columns + unique/per-column indexes; timestamps & soft-delete on by default; opt-in FKs reference the real table/PK with `ON DELETE CASCADE`). |
| `defineLink.ts`       | `defineLink(left, right, options?)` — resolves endpoints (real table + primary key through the global model registry, with a deterministic key-derived fallback) and assembles a `LinkDefinition`.                                             |
| `registry.ts`         | `LinkRegistry` (resolve a pair in either direction, list outgoing links) + `collectLinkModels`.                                                                                                                                                |
| `resolver.ts`         | `setLinkModuleResolver` / `resolveLinkedModule` — dependency inversion so the link service can call other modules without importing `@damatjs/framework`.                                                                                      |
| `service.ts`          | `createLinkService(links)` → `LinkService extends ModuleService({models})` with `create`/`dismiss`/`list`/`listLinkedIds`/`fetch`/`graph`.                                                                                                     |
| `graph.ts`            | `parseFields` (dotted paths → tree), `pruneColumns`, graph config/result types.                                                                                                                                                                |
| `defineLinkModule.ts` | `defineLinkModule(links)` → a `ModuleInstance` registered as the `link` module.                                                                                                                                                                |
| `codegen.ts`          | `renderLinkAugmentations(fields)` — emits the `<table>.links.ts` files that extend each module's entity type with its linked entities.                                                                                                         |
| `config.ts`           | `resolveLinkModuleEntries` (top-level `link` for runtime) + `resolveLinkMigrationModules` (per-owner `link:<owner>` for migrations).                                                                                                           |

## Folder layout — links mirror modules

```
src/links/
├── index.ts                     # aggregates owners → the single `link` runtime module
└── <owner>/                     # e.g. user
    ├── models/<a>-<b>.ts        # defineLink(...)
    ├── index.ts                 # export links + models (collectLinkModels)
    └── migrations/              # junction-table migrations for this owner
```

## How it plugs into the framework

1. **Authoring.** `src/links/<owner>/models/*.ts` default-export `defineLink(...)`.
   `src/links/<owner>/index.ts` exports `links` + `models`. `src/links/index.ts`
   aggregates every owner's `links` and default-exports `defineLinkModule(...)`.
2. **Migrations.** `@damatjs/orm-cli`'s `loadModules` calls
   `resolveLinkMigrationModules(config.links, configDir)`, injecting one
   `link:<owner>` module (tagged `kind: "link"`) per owner directory. The existing
   `discoverModels` reads each owner's `models` export, so
   `migrate:create link:<owner>` / `migrate:up` create the junction tables from
   `links/<owner>/migrations`.
3. **Types.** `@damatjs/cli-codegen` calls `@damatjs/module-generator` for
   `damat codegen <module>`, skips `kind: "link"` modules, then aggregates all
   links and writes a `<table>.links.ts` augmentation into each participating
   module's generated `types/`. Pure base types come from
   `@damatjs/schema-codegen`. Junction tables get **no** generated types.
4. **Boot.** `@damatjs/framework`'s `initializeServices` registers the aggregated
   top-level `links` dir as the single `link` module (via `resolveLinkModuleEntries`),
   so `getModule("link")` resolves one link service over every owner's links. It
   then calls `setLinkModuleResolver(getModule)` so the link service can hydrate
   other modules' rows. The dependency is one-way — `framework → link`, never the
   reverse.

## Junction table shape

For `defineLink({module:"user",model:"users"}, {module:"organization",model:"organizations"})`
(models-map keys for the `users` / `organizations` tables):

```sql
CREATE TABLE "public"."user_organization" (
  "id" TEXT PRIMARY KEY DEFAULT generate_id('link'),
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "created_at" DATE NOT NULL DEFAULT now(),
  "updated_at" DATE NULL,
  "deleted_at" DATE NULL
);
CREATE UNIQUE INDEX "user_organization_pair_uniq" ON "public"."user_organization" ("user_id","organization_id");
CREATE INDEX "user_organization_user_id_idx"        ON "public"."user_organization" ("user_id");
CREATE INDEX "user_organization_organization_id_idx" ON "public"."user_organization" ("organization_id");
```

- **Naming.** Each endpoint resolves its REAL table name (global model
  registry when loaded, else camelCase key -> snake_case) and contributes its
  logical singular (`removeLastS`: `users` -> `user`). A segment collapses to
  the module id when `module === logical` (`user`), else `module_logical`; the
  two segments join with `_`; columns are `<logical>_id` (module-qualified only
  on collision). Override with `options.pivotTable` / `options.pivotColumns`.
  Names are clamped to Postgres' 63-byte limit with a stable hash suffix.
- **Idempotency.** `create` is a single `INSERT … ON CONFLICT (left, right)
DO UPDATE SET deleted_at = NULL` against the unique pair index — atomic
  (no check-then-insert race), and re-creating a dismissed (soft-deleted)
  link revives it.
- **Soft delete.** `dismiss` sets `deleted_at`; every link read filters
  `deleted_at: null` (the ORM does not auto-filter soft-deletes).
- **Opt-in FKs.** `{ database: { foreignKeys: true } }` emits FKs that
  reference each side's resolved table and actual primary key with
  `ON DELETE CASCADE`. If a target model isn't importable at definition time
  (e.g. `migrate:create link:<owner>` loads only the links dir) the PK falls
  back to `id` — set `primaryKey` on the endpoint explicitly for non-`id` PKs.

## Graph query

`LinkService.graph({ module, entity, fields, filters, pagination })` resolves a
field tree. The root `module.entity` must participate in a registered link —
the service refuses unlinked roots so it cannot be used as a generic read path
into arbitrary modules.

- Columns (`"*"` or explicit) are selected/pruned per node.
- A child whose name matches a link's far-side `field`/`model` is a **cross-module
  link**: resolved by reading the junction (batched by all parent ids) and
  recursing into the target module — to any depth.
- A child matching an intra-module relation is loaded via the owning service's
  `include`.

It fetches per hop through each module's own service (respecting isolation)
rather than issuing cross-module SQL joins.

## Tests

- `tests/defineLink.test.ts`, `tests/graph-registry.test.ts`, `tests/pipeline.test.ts`,
  `tests/codegen.test.ts` — no database; cover pivot construction, naming, registry
  resolution, field parsing, that junction models flow through `toModuleSchema` +
  `generateFilesMap`, the `<table>.links.ts` augmentation rendering, and per-owner
  migration-module resolution.
- `tests/integration.test.ts` — `describe.skipIf(!DATABASE_URL)`; builds two toy
  modules + a link and exercises create/idempotency/fetch (both directions)/
  dismiss/revive/graph against a live Postgres.
