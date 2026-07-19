# @damatjs/module internals

Maintainer map for module contracts, standalone execution, tooling, artifact
resolution, and registry trust. Public usage starts in the
[package README](../README.md); the manifest contract is
[MODULES.md](../../../MODULES.md).

## Responsibilities

| Concern             | Responsibility                                                            |
| ------------------- | ------------------------------------------------------------------------- |
| Manifest            | Normalize strict universal `damat.json` data into module runtime metadata |
| Config              | Define and load `module.config.ts`                                        |
| Harness             | Boot one module against PostgreSQL without HTTP                           |
| Runtime             | Run one module through the framework HTTP stack                           |
| Tooling             | Create module migrations and generate types/CRUD slices                   |
| Registry            | Refs, validation, resolution, verification, and trust policy              |
| Artifact resolution | Resolve source, Node package, or Damat package locations                  |
| Pipelines           | Re-export portable pipeline authoring definitions                         |

Authoring APIs such as `defineModule`, `ModuleService`, models, routes,
workflows, jobs, and events remain owned by their real packages.

## Source map

| Path            | Role                                                           |
| --------------- | -------------------------------------------------------------- |
| `src/index.ts`  | Public concern barrels and pipeline exports                    |
| `src/manifest/` | Module normalization, path defaults, entry/artifact resolution |
| `src/config/`   | `defineModuleConfig`, loading, and config types                |
| `src/harness/`  | Database resolution, migration apply, boot, and teardown       |
| `src/runtime/`  | Module-as-app config and lifecycle                             |
| `src/tooling/`  | Migration creation, migration run/status, and codegen          |
| `src/registry/` | Ref parsing, readiness, registry resolution, and verification  |

## Standard module shape

```text
module/
├── damat.json
├── module.config.ts
├── .env
├── src/
│   ├── index.ts
│   ├── service.ts
│   ├── config/
│   ├── models/
│   ├── migrations/
│   ├── types/
│   ├── workflows/
│   ├── api/routes/
│   ├── jobs/
│   ├── events/
│   ├── pipelines/
│   └── links/
└── tests/
```

The manifest determines which optional capabilities actually exist.

## Harness lifecycle

```text
resolve artifact and manifest
  → resolve DATABASE_URL / database config
  → create one connection manager and shared pool
  → apply only this module's migrations
  → initialize module service
  → execute caller callback
  → module teardown
  → close/reset pool
```

The harness assumes one standalone module per process. It does not apply the
assembled backend's shared durability catalogs.

## Runtime lifecycle

```text
load damat.json + module.config.ts
  → build one-module AppConfig
  → initialize services
  → apply module migrations
  → bootstrap file routes
  → serve
  → graceful shutdown
```

The generated `bun run dev` script runs `database:setup` before entering this
runtime, so a missing development database is created first.

## Tooling flow

- `createModuleMigration` discovers models, compares the stored snapshot, and
  writes the next migration to the manifest-declared directory when the schema
  changed.
- `runModuleMigration` and status use `DATABASE_URL` and remain scoped to one
  module owner.
- `generateModuleTypes` resolves the manifest's model, entry, type, workflow,
  and route paths, writes replaceable row/Zod/registry output, and creates
  missing CRUD workflow/route files once.

## Manifest and installation boundary

`damat.json` carries identity, install mappings, package requirements, module
paths, environment declarations, and registry metadata. The installer copies
owned capabilities and records provenance. Shared host config, aliases,
environment values, barrels, imports, runtime roles, and operational routes stay
outside module package ownership.

## Registry and validation

`validateModuleDir` distinguishes installation-blocking errors from
publishing-readiness warnings. Registry resolution preserves source pinning,
owner, integrity, and verification. Rejected and revoked artifacts always fail
the trust gate.

## Invariants

- Root `damat.json` is the portable contract.
- Module names are stable kebab-case identities.
- Convention resolves standard entries and paths; explicit paths override it.
- Harness/runtime create one pool and close it deterministically.
- Module-local migration commands never apply shared system catalogs.
- A module may provide durable definitions but host policy enables and operates
  their workers.
- Installation does not mutate user-owned shared application files.

## Extending the package

- New universal manifest fields start in `@damatjs/installer` types/schema.
- New module runtime metadata must update normalization, types, readiness, and
  docs.
- New harness/runtime options must preserve zero-config conventional behavior.
- New tooling output must remain deterministic and respect scaffold-once files.
- Observable changes update living docs and `releases/module/` together.

## Split docs

- [Manifest](./manifest.md)
- [Config](./config.md)
- [Harness](./harness.md)
- [Runtime](./runtime.md)
- [Tooling](./tooling.md)
- [Registry](./registry.md)
- [Authoring ownership](./authoring.md)
- [Public module authoring](../../../docs/guide/13-authoring-modules.md)
