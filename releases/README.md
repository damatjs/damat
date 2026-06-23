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

All Damat packages are released **in lockstep** — a release moves *every*
published package to the same version, whether or not its own code changed. So
there is a single version to care about, not one per package.

**Current version: `0.3.0`** (every `@damatjs/*` package above).

A package's folder only carries a `<version>.md` (and a detailed index row) for
versions where *its own* code changed; for a lockstep bump with no change of its
own, the package simply moves to the shared version with no new note. That is why
a package can sit at `0.3.0` while the newest version it actually links is older.

What changed in `0.3.0`: [`services`](./services/0.3.0.md) gained `upsert` /
`upsertMany`, cascade delete, and row-returning `updateOne` / `findById` /
`findOne`; [`orm-pg`](./orm-pg/0.3.0.md) gained a bulk-upsert execution path.
Every other package moved to `0.3.0` unchanged.

## Packages

### Framework & app
- [`framework`](./framework/) — `@damatjs/framework`
- [`services`](./services/) — `@damatjs/services`
- [`module`](./module/) — `@damatjs/module`
- [`link`](./link/) — `@damatjs/link`
- [`workflow-engine`](./workflow-engine/) — `@damatjs/workflow-engine`

### ORM
- [`orm`](./orm/) — `@damatjs/orm`
- [`orm-model`](./orm-model/) — `@damatjs/orm-model`
- [`orm-pg`](./orm-pg/) — `@damatjs/orm-pg`
- [`orm-connector`](./orm-connector/) — `@damatjs/orm-connector`
- [`orm-migration`](./orm-migration/) — `@damatjs/orm-migration`
- [`orm-processor`](./orm-processor/) — `@damatjs/orm-processor`
- [`codegen`](./codegen/) — `@damatjs/codegen`
- [`orm-core`](./orm-core/) — `@damatjs/orm-core`
- [`orm-type`](./orm-type/) — `@damatjs/orm-type`

### Core
- [`logger`](./logger/) — `@damatjs/logger`
- [`redis`](./redis/) — `@damatjs/redis`
- [`load-env`](./load-env/) — `@damatjs/load-env`
- [`types`](./types/) — `@damatjs/types`
- [`cli`](./cli/) — `@damatjs/cli`
- [`deps`](./deps/) — `@damatjs/deps`
- [`typescript-config`](./typescript-config/) — `@damatjs/typescript-config`

### CLIs & AI
- [`damat-cli`](./damat-cli/) — `@damatjs/damat-cli`
- [`orm-cli`](./orm-cli/) — `@damatjs/orm-cli`
- [`create-damat-app`](./create-damat-app/) — `@damatjs/create-damat-app`
- [`mcp`](./mcp/) — `@damatjs/mcp`
