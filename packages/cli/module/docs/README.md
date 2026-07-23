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
Fresh module profiles expose only the implemented `module` and `tests`
capabilities. Optional paths are not represented by empty placeholder folders.

`scripts/embedAgents.ts` embeds the scaffold guide before build.

`init/` uses the shared PostgreSQL selection contract, then installs and invokes
`damat module database:setup`. Generated `package.json` uses
`"dev": "damat module dev"`. The dev command resolves capabilities and probes
the port before creating `.damat` or starting its watcher; database-backed
modules get database creation followed by one runtime-owned migration pass.
Service-only modules skip PostgreSQL. The CLI supervises a plain Bun child,
gracefully stops it before each reload, and keeps child readiness independent
of the application logger. On foreground-terminal Ctrl-C, the child
acknowledges its own shutdown before the parent decides whether signal
forwarding is needed; parent-only signals still use a bounded forwarding
fallback.

Module command adapters pass the global verbose state into their handled-error
reports. The flag can appear before `module` or after its subcommand.

`databaseSetup.ts` remains an explicit module-only command: it creates the
selected database and delegates to `migration:run`. Installed backends still
own system catalogs and operational policy.

`module build` invokes `bun run tsc --noEmit` in the module directory before
contract validation. `--no-typecheck` skips that local compiler gate.
