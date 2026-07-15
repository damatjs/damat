# @damatjs/installer — internals

Maintainer documentation for the generic installer engine. The public entry
point is `src/index.ts`; it exports runtime parsers and TypeScript contracts.

## Current module map

| Area                    | Responsibility                                                  |
| ----------------------- | --------------------------------------------------------------- |
| `src/types/origin.ts`   | Local, Git, registry, npm, and tarball requests.                |
| `src/types/recipe.ts`   | Declarative install modes, mappings, packages, and usage hints. |
| `src/types/lockfile.ts` | Immutable provenance and installer-owned resources.             |
| `src/types/plan.ts`     | Serializable file, package, and backup operations.              |
| `src/types/runtime.ts`  | Injected command and logging boundaries.                        |
| `src/types/security.ts` | Verification and structured finding contracts.                  |
| `src/schema/`           | Strict runtime validation with no process-global state.         |
| `src/origin/`           | Origin acquisition and safe archive extraction.                 |
| `src/integrity/`        | Canonical byte, file, and directory-tree SHA-256 identity.      |
| `src/recipe/`           | Mode selection, glob mapping, and recipe hashing.               |
| `src/plan/`             | Serializable source and package operation planning.             |
| `src/lockfile/`         | Strict reads and atomic deterministic lockfile replacement.     |
| `src/transaction/`      | Exclusive markers and lean inverse journals.                    |
| `src/package-manager/`  | Structured Bun, npm, pnpm, and Yarn target adapters.            |
| `src/usage/`            | Advisory usage scanning with managed-path exclusions.           |
| `src/backup/`           | Modified-owned-file backups and exact restoration.              |

## Schema invariants

- Input values are unknown until parsed.
- Objects reject fields outside the documented contract.
- Required strings cannot be blank.
- Installation IDs use lowercase kebab-case.
- Install modes are `source` or `package`; a recipe default must appear in its
  declared modes.
- Git subdirectories, mapping targets, owned paths, and usage target patterns
  cannot be absolute, use backslashes, or contain a parent segment.
- Recipe values are data only. There is no hook, script, command, or callback
  field.
- Lock records retain both mutable requests and immutable resolved identities.
- File ownership always includes the installed checksum.
- Package ownership is derived across installation records rather than stored
  as a mutable counter.

The acquisition, integrity, planning, and transaction layers build on these
contracts without weakening boundary validation.

## Acquisition boundaries

- Git uses argument arrays through the injected runner; no shell strings are
  created.
- Registry adapters resolve descriptors through a caller port and detect
  recursive reference cycles.
- npm metadata resolves an exact version before acquiring its tarball.
- npm SRI and explicit tarball integrity verify downloaded bytes before
  extraction; SHA-256 and SHA-512 are supported.
- Tar extraction writes into an isolated temporary root and rejects non-file
  and non-directory entries.
- Every temporary acquisition returns idempotent cleanup and also cleans itself
  when acquisition fails.

## Canonical identity

Directory entries are sorted and serialized with normalized type, relative
path, executable mode, size, and content digest. `.git` and `node_modules` are
excluded. Archive-byte integrity is distinct from this canonical tree identity.
Finalization verifies expected tree integrity before returning and cleans
temporary artifacts when identity resolution fails.

Recipe mappings use first-match semantics. Ignore rules run first, unmatched
files are omitted when mappings are present, output is sorted by target, and
symbolic links are rejected. With no mappings, source files retain their
artifact-relative paths.

Lockfile writes validate the complete next value before creating a uniquely
named sibling temporary file and atomically renaming it. Journal entries are
flushed before their corresponding mutation and replayed in reverse during
rollback. Successful completion removes the journal and active marker.

Execution captures inverse data before each managed file or package operation,
then records the next installation state in `damat.lock.json` last. Removal and
confirmed update backups live outside the lock so lock deletion cannot erase
recovery data.
