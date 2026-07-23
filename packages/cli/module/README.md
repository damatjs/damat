# @damatjs/cli-module

Standalone capabilities for authoring and installing Damat modules.

```ts
import { moduleCliCapability } from "@damatjs/cli-module";
```

`module plan/add/list/update/remove` use the same transactional engine as Kit
and accept registry refs, paths, directories, Git, npm, and tarballs. Source is
stable and editable. Node and Damat package storage are explicit early-alpha
modes requiring `--experimental-package`.

The installer owns only files it adds. It never edits `damat.config.ts`,
`tsconfig.json`, `.env*`, barrels, or call sites; commands report that work for
the user or AI. Module scaffolds write root `damat.json` and rely on
conventional `src/index.ts` discovery.

Provider modules use these same commands and remain `kind: "module"`. Their
installation instructions tell the backend owner which top-level provider role
to bind after registering the installed module.

The package also owns module init/dev/build/validation, migrations, codegen,
and the embedded authoring guide.

A fresh scaffold declares only the `module` and `tests` capabilities it
actually contains. Model, migration, route, workflow, job, event, pipeline,
link, and generated type paths are added only when those artifacts exist, so a
new package can be planned, loaded, and started immediately.

`module init` accepts or interactively collects PostgreSQL credentials, writes
both `.env.example` and ignored `.env`, installs dependencies, creates the
module development database, and applies that module's migrations. Its
`database:setup` command is intentionally module-scoped: a backend remains the
owner of shared durability, jobs, durable-event, and pipeline catalogs.

`module dev` owns development preflight and lifecycle. It loads the environment
and normalized capability plan, rejects an occupied fixed port before creating
the watcher or database pool, creates a missing database only for a
database-backed module, and then starts the watched standalone runtime. The
child prints readiness directly after listening, including the `/api` mount and
Ctrl-C guidance, and reports the actual port selected by `--port 0`. On a source
change, the CLI asks the current child to shut down, awaits worker and resource
cleanup, and only then starts its replacement.
Interactive Ctrl-C may reach the foreground parent and child together. The
watcher requests graceful stop over IPC, and the child acknowledges its
idempotent shutdown. An operating-system signal is reserved for an
unacknowledged fallback, avoiding duplicate signals during worker cleanup.

All module failures honor the composed CLI's global verbose mode. Both
`damat --verbose module dev` and `damat module dev --verbose` include the
underlying error and stack.

`module build` type-checks with the module project's installed TypeScript
compiler through `bun run tsc --noEmit`; it does not use registry resolution.

See [internals](./docs/README.md) and the [manifest contract](../../../MODULES.md).
