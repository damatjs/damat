# Module CLI internals

The package exports independent `module` and `auth` capabilities.

Module installation uses three small layers:

- `profile/` loads `damat.json`, supplies Damat capability fallbacks, and builds
  advisory integration instructions.
- `shared/` resolves every origin through `@damatjs/installer`, matches the
  receiving backend, builds add/update plans, executes transactions, and
  reports integration work.
- `add`, `plan`, `list`, `update`, and `remove` are thin command adapters.

Installation commands use the transactional installer and keep shared config,
TypeScript aliases, environment, barrels, and call sites user-owned.

Module and auth scaffolds omit redundant entry metadata. Standard
`src/index.ts` or sibling `index.ts` entries are discovered by
`@damatjs/module`; custom layouts declare an explicit override.

`scripts/embedAgents.ts` embeds the scaffold guide before build.

`init/` uses the shared PostgreSQL selection contract, then installs and invokes
`damat module database:setup`. The scaffold's dev script repeats that idempotent
preflight. `databaseSetup.ts` creates the selected database and delegates only
to `migration:run`; it never applies backend-owned system catalogs.
