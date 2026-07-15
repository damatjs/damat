# Origins

The installer accepts local, Git, registry, npm, and tarball requests through
one runtime-validated union.

## Acquisition

- Local paths are resolved in place and are never deleted by cleanup.
- Git uses an injected argument-array runner, detached checkout, safe optional
  subdirectory, and commit finalization.
- Registry descriptors are supplied by the caller and retain owner,
  verification, integrity, and package-reference metadata. Cycles are rejected.
- npm accepts an exact version or dist-tag, records the selected exact version
  and tarball, and verifies registry SRI against the downloaded archive bytes.
- Tarballs may be local, `file:` URLs, or fetched remotely. Only regular files
  and directories are extracted into an isolated temporary root. Optional
  SHA-256 or SHA-512 integrity is verified before extraction.

Every temporary result has idempotent cleanup. `resolveArtifact` computes
canonical tree integrity, creates immutable provenance, and advertises package
mode only when an immutable package reference exists. Archive-byte integrity
and extracted-tree integrity are separate checks with separate identities.
