# Lockfile and security

`damat.lock.json` stores schema version 1 installation records. Each record
contains mode, mutable origin request, immutable identity, artifact and recipe
integrity, verification status, installed timestamp, owned file checksums,
owned package references, and usage hints. Package ownership counts are derived
across records.

Writes validate the complete value, serialize keys deterministically, create a
unique sibling temporary file, and atomically rename it.

Security reports carry origin, immutable identity, expected and computed
integrity, verification source, selected mode, structured findings, warnings,
and the decision. Unverified behavior follows `off`, `warn`, or `require`.
Rejected/revoked registry states, integrity mismatches, executable recipe
fields, unsafe archive findings, and unapproved dependency scripts deny the
operation.

Remote tar and npm integrity applies to the archive bytes and is verified
before extraction. The lock record stores the canonical extracted-tree digest
as artifact integrity, keeping transport verification distinct from ownership
and update comparisons.

Confirmed remove/update operations back up only modified owned files under
`.damat/backups`. Each backup has independent provenance and checksums and
survives lock-record removal.
