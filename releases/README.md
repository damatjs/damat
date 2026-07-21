# Releases

The **change record** for every Damat package — what changed in each version and
how to move to it. This is the history. For how anything works **right now**, read
the [package READMEs](../README.md#packages) and [the guide](../docs/GUIDE.md);
those always describe the current version only.

How this is organized (see the full rules in
[Documentation & releases standard](../docs/DOCUMENTATION-STANDARD.md)):

- One folder per package, named by its unscoped name (`@damatjs/orm-model` →
  [`orm-model/`](./orm-model/)).
- Each folder's `README.md` lists every version newest-first.
- Each version with package-relevant changes has a `<version>.md` with a
  before → after summary and exact upgrade steps.

**Want to bump a package?** Open its folder's `README.md` and follow the link for
your target version.

## Versioning

All active Damat packages are released **in lockstep** — a release moves every
published package to the same version, whether or not its own code changed.

**Current source version: `1.0.0`** for every active public package.
`@damatjs/codegen` is archived at its last npm release, `2.1.0`, and is not part
of the workspace or active publication set.

A package's folder only carries a `<version>.md` (and a detailed index row) for
versions where _its own_ code changed; for a lockstep bump with no change of its
own, the package simply moves to the shared version with no new note. That is why
a package can sit at `0.6.0` while the newest version it actually links is older.

## 1.0.0 stable release

The first stable npm publication uses package version `1.0.0` and corrective
Git tag `v1.0.0+0.2`. The build metadata stays on the tag because npm normalizes
it out of package versions; it does not change the stable API or precedence.

This is the first stable Damat release. Install the CLI from npm's `latest`
channel:

```bash
bunx @damatjs/damat-cli@latest create my-app
```

This release establishes shared PostgreSQL infrastructure, durable jobs
and named-consumer events, durable pipelines, transaction composition,
deterministic system migrations, headless operational inspection, selectable
runtime roles, and standardized integration providers. See
[`durability`](./durability/), [`jobs`](./jobs/),
[`events`](./events/), [`services`](./services/),
[`pipelines`](./pipelines/),
[`orm-migration`](./orm-migration/), [`orm-cli`](./orm-cli/), and
[`framework`](./framework/). Provider contracts are tracked under
[`provider`](./provider/), [`auth`](./auth/), [`payment`](./payment/),
and [`subscription`](./subscription/). Adaptive Redis
acceleration and pool observability
are tracked under [`redis`](./redis/), [`orm-connector`](./orm-connector/), and
the [`default` reference backend](./default/).

What changed in `0.6.0` — a hardening release across the line:
[`redis`](./redis/0.6.0.md) made its hot paths atomic and non-blocking;
[`framework`](./framework/0.6.0.md) auth middleware fails closed;
[`services`](./services/0.6.0.md) sanitizes request-derived query options and
filters soft-deleted rows by default;
[`workflow-engine`](./workflow-engine/0.6.0.md) ties retries to step idempotency;
[`orm-migration`](./orm-migration/0.6.0.md) serializes concurrent runs behind an
advisory lock and supports non-transactional statements;
[`orm-model`](./orm-model/0.6.0.md) fixes timestamp column types;
[`orm-pg`](./orm-pg/0.6.0.md) whitelists `ORDER BY` inputs;
[`link`](./link/0.6.0.md) resolves junctions against real tables and primary keys;
[`damat-cli`](./damat-cli/0.6.0.md) gates unverified module sources and lifecycle
scripts behind explicit flags, with [`mcp`](./mcp/0.6.0.md) exposing the same
gates and [`create-damat-app`](./create-damat-app/0.6.0.md) dropping shell-string
execution. Recent history: `0.5.0` was a codebase audit (full test coverage, two
latent bugs fixed — [`framework`](./framework/0.5.0.md),
[`orm-migration`](./orm-migration/0.5.0.md)); `0.4.1` fixed cascade deletes on
snake_case tables ([`orm-pg`](./orm-pg/0.4.1.md),
[`services`](./services/0.4.1.md)).

## Packages

### Framework & app

- [`framework`](./framework/) — `@damatjs/framework`
- [`default`](./default/) — `@damatjs/default` reference backend
- [`services`](./services/) — `@damatjs/services`
- [`module`](./module/) — `@damatjs/module`
- [`module-generator`](./module-generator/) — `@damatjs/module-generator`
  (Damat discovery, filesystem output, registries, scaffolds, barrels)
- [`link`](./link/) — `@damatjs/link`
- [`workflow-engine`](./workflow-engine/) — `@damatjs/workflow-engine`
- [`pipelines`](./pipelines/) — `@damatjs/pipelines`
- [`installer`](./installer/) — `@damatjs/installer`

### ORM

- [`orm`](./orm/) — `@damatjs/orm`
- [`orm-model`](./orm-model/) — `@damatjs/orm-model`
- [`orm-pg`](./orm-pg/) — `@damatjs/orm-pg`
- [`orm-connector`](./orm-connector/) — `@damatjs/orm-connector`
- [`orm-migration`](./orm-migration/) — `@damatjs/orm-migration`
- [`orm-processor`](./orm-processor/) — `@damatjs/orm-processor`
- [`codegen`](./codegen/) — archived `@damatjs/codegen` history
- [`schema-codegen`](./schema-codegen/) — `@damatjs/schema-codegen` (pure schema
  rendering)
- [`orm-core`](./orm-core/) — `@damatjs/orm-core`
- [`orm-type`](./orm-type/) — `@damatjs/orm-type`

### Core

- [`durability`](./durability/) — `@damatjs/durability`
- [`jobs`](./jobs/) — `@damatjs/jobs`
- [`events`](./events/) — `@damatjs/events`
- [`logger`](./logger/) — `@damatjs/logger`
- [`redis`](./redis/) — `@damatjs/redis`
- [`load-env`](./load-env/) — `@damatjs/load-env`
- [`types`](./types/) — `@damatjs/types`
- [`cli`](./cli/) — `@damatjs/cli`
- [`deps`](./deps/) — `@damatjs/deps`
- [`typescript-config`](./typescript-config/) — `@damatjs/typescript-config`

### Providers

- [`provider`](./provider/) — `@damatjs/provider`
- [`auth`](./auth/) — `@damatjs/provider-auth`
- [`payment`](./payment/) — `@damatjs/provider-payment`
- [`subscription`](./subscription/) — `@damatjs/provider-subscription`

### CLIs & AI

- [`damat-cli`](./damat-cli/) — `@damatjs/damat-cli`
- [`cli-app`](./cli-app/) — `@damatjs/cli-app`
- [`cli-codegen`](./cli-codegen/) — `@damatjs/cli-codegen`
- [`cli-kit`](./cli-kit/) — `@damatjs/cli-kit`
- [`cli-module`](./cli-module/) — `@damatjs/cli-module`
- [`cli-support`](./cli-support/) — `@damatjs/cli-support`
- [`orm-cli`](./orm-cli/) — `@damatjs/orm-cli`
- [`create-damat-app`](./create-damat-app/) — `@damatjs/create-damat-app` (retired 0.7 — use `bunx @damatjs/damat-cli create`)
- [`mcp`](./mcp/) — `@damatjs/mcp`
