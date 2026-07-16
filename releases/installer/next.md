# @damatjs/installer Unreleased

> Introduces the framework-agnostic foundation for safely installing source and
> package artifacts.

## What changed

Installer behavior previously lived inside individual CLI capabilities. The
shared origin, recipe, plan, security, runtime, and lockfile contracts now have
a headless package with strict runtime validation.

## Added

- Local, Git, registry, npm, and tarball origin request schemas.
- Declarative source/package recipe schemas with safe relative targets.
- Immutable provenance and installer ownership lockfile schemas.
- Serializable operation, runtime, and security contracts.
- Rejection of unknown and executable manifest fields.
- Acquisition adapters for local directories, Git, injected registries, npm,
  and local or remote tarballs.
- Safe tar/tgz extraction with path, entry-type, truncation, and cleanup checks.
- Pre-extraction archive-byte verification for hexadecimal SHA-256 and npm SRI
  SHA-256/SHA-512, distinct from canonical extracted-tree identity.
- Canonical byte, file, and tree SHA-256 integrity.
- Immutable Git commit, exact npm version, registry, local, and tarball
  provenance with supported-mode discovery.
- Override/default/source mode selection without silent fallback.
- Deterministic declarative glob mapping, recipe hashing, and serializable
  source/package operation plans.
- Atomic deterministic lockfile I/O and checksum-based ownership/collision
  analysis.
- Exclusive transaction markers and lean reverse journals for touched files.
- Bun, npm, pnpm, and Yarn target detection and argument-array adapters with
  dependency scripts disabled by default.
- Add, update, and remove planning with advisory usage locations and shared
  package preservation.
- Modified-owned-file-only backups, exact restoration, dry runs, lock-last
  execution, injected-failure rollback, and explicit crash recovery.
- Structured off/warn/require security reports with hard denial for rejected,
  revoked, mismatched, executable, unsafe-archive, and unapproved-script cases.
- Cross-origin content parity and Bun/npm/pnpm/Yarn execution and rollback
  parity tests.
- Strict universal `damat.json` manifests for applications, modules, kits, and
  packages, with named provided and accepted capabilities.
- Install-profile matching and deterministic capability-to-target recipes.
- CLI override → manifest default → source mode precedence.
- Explicit experimental package backend selection recorded in plans and locks.
- An experimental Damat package store under `.damat/packages/<id>` with no
  dependency lifecycle scripts and no host `package.json` mutation.
- Uniform source, Node package, and Damat package module resolution into one
  validated `ResolvedModule` runtime surface.
- Strict package-name validation, realpath containment, and no compatibility
  fallback for malformed manifests.

## Breaking

- None — this is a new package.

## Action required

Package-mode callers must opt in explicitly and select a supported backend.
Source mode remains the stable default.

## References

- Current behavior: [package README](../../packages/installer/README.md)
- Source: `packages/installer/src/`
