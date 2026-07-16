# Unreleased

## Changed

Module and auth commands now use the shared transactional installer for add,
plan, list, update, and remove. Local paths, directories, Git, registries, npm,
and tarballs share one origin and provenance contract.

New module and auth-storage scaffolds write root `damat.json`; legacy
`module.json` remains readable during 0.x. Source installs copy only declared
capabilities and report host integration work without editing shared config,
barrels, env files, or call sites.

Package mode supports explicitly opted-in Node and Damat backends as early
alpha. The npm-shaped `damat module publish` command has been removed; releases
are expected to originate from Git tags and registry automation.

## Action required

Replace `damat module publish` automation with a Git-tagged release workflow.
Review the CLI's integration notices after add/update/remove and apply host-owned
wiring changes deliberately.
