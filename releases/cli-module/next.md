# Unreleased

## Changed

Module and auth commands now use the shared transactional installer for add,
plan, list, update, and remove. Local paths, directories, Git, registries, npm,
and tarballs share one origin and provenance contract.

New module and auth-storage scaffolds write root `damat.json`; legacy
`module.json` remains readable during 0.x. Scaffolds omit redundant entry
metadata and use conventional `src/index.ts` or sibling `index.ts` discovery.
Fresh scaffolds now pass their generated contract test immediately, including
safe root-relative test mappings and the declared generated-types directory.
Source installs copy only declared capabilities and report host integration
work without editing shared config, barrels, env files, or call sites.

Package mode supports explicitly opted-in Node and Damat backends as early
alpha. The npm-shaped `damat module publish` command has been removed; releases
are expected to originate from Git tags and registry automation.

`module init` now shares the PostgreSQL credential flow with backend creation,
writes an ignored `.env`, installs dependencies, creates the development
database, and applies module-owned migrations. Fresh scaffolds include durable
jobs, events, and pipeline authoring packages and run `database:setup` before
standalone development. System durability catalogs remain backend-owned.
The generated README and embedded AGENTS guide now teach the current
`damat.json` contract, database ownership boundary, durable providers, real
package imports, and host integration review flow.
Remove help now uses the transactional installer's `--yes` confirmation for
modified owned files and no longer advertises obsolete directory, force, or
environment-cleanup flags.
An unreachable legacy command-failure helper has been removed.

## Action required

Replace `damat module publish` automation with a Git-tagged release workflow.
Review the CLI's integration notices after add/update/remove and apply host-owned
wiring changes deliberately.
Use `--no-install` or `--no-database-setup` when provisioning must happen later.
