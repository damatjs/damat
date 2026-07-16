# Module CLI internals

The package exports independent `module` and `auth` capabilities.

Module installation uses three small layers:

- `profile/` loads `damat.json`, normalizes legacy `module.json`, supplies Damat
  capability fallbacks, and builds advisory integration instructions.
- `shared/` resolves every origin through `@damatjs/installer`, matches the
  receiving backend, builds add/update plans, executes transactions, and
  reports integration work.
- `add`, `plan`, `list`, `update`, and `remove` are thin command adapters.

Installation commands never call the legacy config, TypeScript, environment,
copy-layout, or package helpers. Those helpers remain only where separate
authoring/provider commands still depend on them. npm-shaped publication is
absent; registry publication belongs to later Git automation.

Module and auth scaffolds omit redundant entry metadata. Standard
`src/index.ts` or sibling `index.ts` entries are discovered by
`@damatjs/module`; custom layouts declare an explicit override.

`scripts/embedAgents.ts` embeds the scaffold guide before build.
