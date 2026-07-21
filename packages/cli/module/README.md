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

`module init` accepts or interactively collects PostgreSQL credentials, writes
both `.env.example` and ignored `.env`, installs dependencies, creates the
module development database, and applies that module's migrations. Its
`database:setup` command is intentionally module-scoped: a backend remains the
owner of shared durability, jobs, durable-event, and pipeline catalogs.

See [internals](./docs/README.md) and the [manifest contract](../../../MODULES.md).
