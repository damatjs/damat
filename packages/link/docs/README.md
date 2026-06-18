# @damatjs/link — internals

This package implements cross-module links. It deliberately reuses the existing
ORM and service machinery: a junction table is just an ordinary `ModelDefinition`,
and the link module is just a `defineModule` instance, so migrations, snapshots,
and codegen need **no** special-casing.

## Module map

| File | Responsibility |
|------|----------------|
| `types.ts` | `LinkEndpoint`, `ResolvedEndpoint`, `LinkOptions`, `LinkDefinition`, row/model refs. |
| `naming.ts` | `defaultPivotTable` (segment-collapsing, 63-byte clamp) + `pivotColumns` (collision-safe FK column names). |
| `pivot.ts` | `buildPivotModel` — constructs the junction `ModelDefinition` with the orm-model DSL (id + 2 FK columns + unique/per-column indexes; timestamps & soft-delete on by default). |
| `defineLink.ts` | `defineLink(left, right, options?)` — resolves endpoints and assembles a `LinkDefinition`. |
| `registry.ts` | `LinkRegistry` (resolve a pair in either direction, list outgoing links) + `collectLinkModels`. |
| `resolver.ts` | `setLinkModuleResolver` / `resolveLinkedModule` — dependency inversion so the link service can call other modules without importing `@damatjs/framework`. |
| `service.ts` | `createLinkService(links)` → `LinkService extends ModuleService({models})` with `create`/`dismiss`/`list`/`listLinkedIds`/`fetch`/`graph`. |
| `graph.ts` | `parseFields` (dotted paths → tree), `pruneColumns`, graph config/result types. |
| `defineLinkModule.ts` | `defineLinkModule(links)` → a `ModuleInstance` registered as the `link` module. |
| `config.ts` | `resolveLinkModuleEntries(config.links, cwd)` — shared by framework boot and the ORM CLI. |

## How it plugs into the framework

1. **Authoring.** `src/links/*.ts` default-export `defineLink(...)`. `src/links/index.ts`
   exports `links`, `models` (`collectLinkModels`), and a default `defineLinkModule(links)`.
2. **Migrations / codegen.** `@damatjs/orm-cli`'s `loadModules` calls
   `resolveLinkModuleEntries(config.links, configDir)` and injects a synthetic
   `link` module pointing at `src/links`. The existing `discoverModels` reads the
   `models` export; `migrate:create`/`migrate:up`/`generate:types` then treat the
   junction tables like any module's tables. (The conventional `src/links/models/`
   directory re-exports the junctions so `generate:types` finds it.)
3. **Boot.** `@damatjs/framework`'s `initializeServices` appends the same link
   entries to the list passed to `initModules`, so `getModule("link")` resolves
   the link service. It then calls `setLinkModuleResolver(getModule)` so the link
   service can hydrate other modules' rows. The dependency is one-way —
   `framework → link`, never the reverse.

## Junction table shape

For `defineLink({module:"user",model:"user"}, {module:"organization",model:"organization"})`:

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

- **Naming.** A segment collapses to the module id when `module === model`
  (`user`), else `module_model`; the two segments join with `_`. Override with
  `options.pivotTable`. Names are clamped to Postgres' 63-byte limit with a stable
  hash suffix.
- **Idempotency.** `create` find-or-restore-or-creates against the unique pair
  index; re-creating a dismissed (soft-deleted) link revives it.
- **Soft delete.** `dismiss` sets `deleted_at`; every link read filters
  `deleted_at: null` (the ORM does not auto-filter soft-deletes).

## Graph query

`LinkService.graph({ module, entity, fields, filters, pagination })` resolves a
field tree:

- Columns (`"*"` or explicit) are selected/pruned per node.
- A child whose name matches a link's far-side `field`/`model` is a **cross-module
  link**: resolved by reading the junction (batched by all parent ids) and
  recursing into the target module — to any depth.
- A child matching an intra-module relation is loaded via the owning service's
  `include`.

It fetches per hop through each module's own service (respecting isolation)
rather than issuing cross-module SQL joins.

## Tests

- `tests/defineLink.test.ts`, `tests/graph-registry.test.ts`, `tests/pipeline.test.ts`
  — no database; cover pivot construction, naming, registry resolution, field
  parsing, and that junction models flow through `toModuleSchema` + `generateFilesMap`.
- `tests/integration.test.ts` — `describe.skipIf(!DATABASE_URL)`; builds two toy
  modules + a link and exercises create/idempotency/fetch (both directions)/
  dismiss/revive/graph against a live Postgres.
