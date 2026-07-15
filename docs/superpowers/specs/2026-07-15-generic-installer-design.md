# Generic Installer Engine Design

**Status:** Approved for implementation planning  
**Package:** `@damatjs/installer`  
**Phase:** Damat v1 roadmap, Phase 3

## Purpose

`@damatjs/installer` is a headless, framework-agnostic engine for installing,
updating, and removing artifacts. It normalizes multiple artifact origins into
one declarative operation plan, records immutable provenance and ownership in
`damat.lock.json`, and protects installer-owned user modifications without
copying or managing the whole project.

Kit and module commands do not migrate in this phase. Phase 4 will express
their behavior as installer recipe profiles and replace their current install
implementations.

## Principles

- Artifact origin and installation mode are independent.
- Mode precedence is caller override, recipe default, then `source`.
- An explicitly requested unsupported mode returns an error; it never falls
  back silently.
- Remote recipes are data only. Executable hooks are rejected.
- The engine owns only operations in its plan.
- User-authored integration code is reported but never removed automatically.
- Transaction recovery stores inverse data only for paths touched by the
  current transaction.
- Long-term removal backups are created only for modified owned files.
- Every public operation supports planning without mutation.

## Package Boundaries

The package is split into small units:

- `schema/`: runtime validation and public types.
- `origin/`: local, Git, registry, npm, and tarball resolution.
- `recipe/`: declarative mapping and mode selection.
- `integrity/`: canonical SHA-256 hashing for files and directory trees.
- `plan/`: operation generation, ownership checks, and collision reporting.
- `transaction/`: locking, inverse journal, execution, and crash recovery.
- `lockfile/`: atomic `damat.lock.json` reads and writes.
- `backup/`: modified-file backup manifests and restoration.
- `usage/`: literal integration-hint scanning.
- `package-manager/`: Bun, npm, pnpm, and Yarn target adapters.
- `security/`: verification decisions and human-readable reports.

No code, test, fixture, script, or generated file may exceed 100 physical
lines.

## Public Data Model

`ArtifactOrigin` is a discriminated union for:

- Local file or directory.
- Git repository, optional ref, and optional safe subdirectory.
- Registry reference resolved through an injected registry port.
- npm package reference resolved to an exact version and tarball.
- Local or remote tarball.

`ResolvedArtifact` contains the original request, immutable identity, integrity,
temporary local content when applicable, immutable package reference when
available, supported modes, verification metadata, and cleanup function.

`InstallRecipe` contains artifact identity, optional version, supported modes,
default mode, mapping rules, ignored paths, package requirements, notes, and
literal usage hints. Mapping rules use glob-like source patterns and safe
project-relative targets. Unknown executable fields such as hooks, commands,
or scripts are validation errors for remote recipes.

`InstallerPlan` contains the action, artifact, selected mode, typed operations,
ownership effects, conflicts, warnings, security report, and whether explicit
confirmation is required. A plan is serializable and contains no functions.

Operations cover owned file creation/replacement/removal, package dependency
addition/removal, lockfile mutation, modified-file backup, and usage warnings.
Framework-specific configuration mutations are introduced by trusted Phase 4
profiles as declarative file operations, not remote callbacks.

## Origin Resolution

All resolvers return the same `ResolvedArtifact` contract.

- Local directories receive a canonical sorted tree hash.
- Local files receive a content hash and may be mapped as a single-file
  artifact or recognized as a tarball.
- Git refs are cloned or fetched into a temporary directory and resolved with
  `git rev-parse HEAD`; the commit SHA is the immutable identity.
- Registry resolution uses an injected `RegistryResolver` interface. A registry
  descriptor may point to another origin and may add owner, verification,
  integrity, and immutable package-reference metadata.
- npm resolution pins an exact version, tarball URL, and registry integrity.
- Direct tarballs are downloaded or read locally, integrity checked, and
  extracted with traversal and unsafe-entry protection.

Remote archives reject absolute paths, parent traversal, device entries, and
links that escape the extraction root. Expected integrity mismatches fail
before planning.

## Mode Semantics

`source` mode maps artifact content into installer-owned project paths.

`package` mode creates an immutable package-manager dependency operation. An
origin supports package mode only when it resolves to a valid immutable package
reference, such as an exact npm version, Git commit reference, local package,
or package tarball.

The selected mode is resolved in this order:

1. Explicit caller or CLI override.
2. `install.default` from the validated recipe.
3. System default `source`.

## Provenance and Integrity

Provenance records both the user's origin request and the resolved immutable
identity. Git provenance always contains the commit SHA even when the request
used a branch or tag. npm provenance contains exact version, tarball URL, and
registry integrity. Registry provenance preserves registry identity, owner,
verification, and the resolved inner origin.

Canonical installer integrity uses SHA-256. Directory hashes sort normalized
relative paths and include entry type, path, mode, size, and file digest.
Recipe integrity is stored separately so installation rules can be audited
independently of artifact bytes.

## Lockfile and Ownership

`damat.lock.json` has a versioned schema and an installation map keyed by a
stable artifact installation ID. Each record contains:

- Artifact kind, name, version, and selected mode.
- Immutable provenance, artifact integrity, and recipe integrity.
- Verification result and installation timestamp.
- Owned paths with their freshly installed checksums.
- Package dependency names, immutable references, and ownership counts.
- Declarative usage hints needed for later removal warnings.

The lockfile does not store source contents or user backups. It is written
atomically only after all other operations succeed.

An unowned existing target is a collision unless the plan explicitly permits
adoption or replacement. A target owned by another installation is a conflict.
Updating or removing an owned file compares its current checksum with the
freshly installed checksum.

## Lean Transaction Journal

The transaction journal records only inverse information for operations the
engine is about to perform:

- Creating a new file records an inverse delete.
- Replacing or deleting an existing owned file stores only that file's previous
  bytes and metadata.
- Changing `package.json` or a package-manager lockfile stores only those
  touched files.
- Changing `damat.lock.json` stores its previous bytes.

The engine acquires an exclusive project transaction marker, persists the
journal before each mutation, applies writes through temporary files and atomic
renames, then writes `damat.lock.json` last. Successful completion removes the
journal and marker.

On an ordinary failure, inverse operations run in reverse order. A surviving
journal indicates interruption; the next mutating invocation recovers it before
creating a new plan. Exact rollback covers managed project files, package
manifests, and package-manager lockfiles. `node_modules` reconciliation is
best-effort and is included in the result report.

## Modified-File Removal Backup

Removal uses the installed checksum as the authoritative comparison:

- Unchanged owned file: remove without backup.
- Modified owned file: report it and require explicit confirmation.
- Confirmed modified removal: copy only the modified current file into
  `.damat/backups/<installation-id>/<timestamp>/`, then remove it.
- User-modified dependency reference: report it and leave it untouched.

Each backup has a manifest with original target path, installed checksum,
current checksum, provenance, removal time, and stored backup path. Textual
unified diffs are optional when original source bytes are already available;
they are not required for protection. The full modified bytes are authoritative
and can be restored through a small `restoreBackup` API.

Backups are separate from `damat.lock.json` and survive removal of the
installation record. No backup is created when all owned content is unchanged.

## Integration Usage Warnings

Recipes may declare literal usage hints with target globs and literal tokens,
such as import specifiers, package names, configuration keys, or exported
identifiers. Before removal, the engine scans non-owned project text files,
excluding dependency, VCS, build, transaction, and backup directories.

Matches are reported as file, line, and token. They make removal require
confirmation but are never edited automatically. The report states that the
scan is advisory because a generic literal scan cannot prove semantic usage.

## Package-Manager Adapters

Adapters support Bun, npm, pnpm, and Yarn target projects. Detection uses an
explicit caller selection first, then the target `packageManager` field, then
recognized lockfiles. Ambiguous projects require an explicit choice.

Adapters produce commands and identify the manifest and lockfiles they may
touch. They never execute install scripts unless policy explicitly permits it.
Removal deletes an installer-owned dependency only when no other installation
record owns it and the current dependency reference still matches the recorded
reference.

## Security Reporting

Every plan includes a structured security report covering origin type,
immutable identity, expected and computed integrity, registry verification,
remote-recipe validation, archive safety, requested mode, package scripts, and
unverified-source policy.

Policy levels are `off`, `warn`, and `require`. A report distinguishes trusted
registry assertions from author-declared metadata. Local and direct Git sources
remain allowed when policy permits them and are explicitly reported as
unverified rather than silently trusted.

## Headless API

The package exposes validation and planning separately from mutation:

- `resolveArtifact(request, ports)`
- `createAddPlan(input)`
- `createUpdatePlan(input)`
- `createRemovePlan(input)`
- `executePlan(plan, runtime)`
- `recoverTransaction(projectDir, runtime)`
- `restoreBackup(projectDir, backupId)`
- `readInstallerLock(projectDir)`

The runtime injects filesystem, process runner, fetch, clock, ID generation,
registry resolver, package-manager selection, security policy, and logger. Tests
can run without process-global state or live network access.

## Testing Strategy

Schema tests cover valid and invalid origins, recipes, plans, provenance, and
lockfiles. Resolver contract tests install the same fixture from local, Git,
registry, npm, and tarball origins. Applicable origins are tested in both source
and package modes.

Planner tests cover mode precedence, mapping, path safety, collisions,
ownership, modified files, dependency reference counting, dry runs, security
reports, and usage warnings.

Failure injection runs after every mutating operation and proves that managed
project files, `package.json`, lockfiles, and `damat.lock.json` return to their
exact starting bytes. Crash-recovery tests leave a journal behind and verify the
next invocation restores it. Removal tests prove unchanged files create no
backup, modified files require confirmation, confirmed removal stores only
modified files, and restoration returns their exact bytes.

Each package gate runs build, tests, lint, type checking, documentation checks,
package-content checks, and the 100-line code-file checker.

## Out of Scope

- Migrating kit or module commands; that is Phase 4.
- Loading packaged Damat modules at runtime; that is Phase 5.
- Registry hosting, GitHub automation, or artifact build automation.
- Automatically editing user-authored integration code during removal.
- Exact restoration of the entire `node_modules` directory.
- Arbitrary executable installer plugins or remote lifecycle hooks.
