# Durability internals

## Package map

| Path                          | Responsibility                                    |
| ----------------------------- | ------------------------------------------------- |
| `src/client/types.ts`         | Structural executor, pool, and client contracts   |
| `src/client/create.ts`        | Transaction runner with commit, rollback, release |
| `src/client/global.ts`        | Process-wide optional default client              |
| `src/migrations/types.ts`     | System migration and catalog contracts            |
| `src/migrations/catalog.ts`   | Catalog validation, deduplication, and ordering   |
| `src/migrations/shared-*`     | Shared `_damat_` table descriptors                |
| `src/migrations/readiness.ts` | Read-only applied-migration validation            |
| `src/errors.ts`               | Setup and migration-readiness errors              |

## Invariants

- The package never opens a PostgreSQL pool; callers own pool lifecycle.
- A client transaction always releases its checked-out connection.
- Catalog owners must match every migration they contain.
- Migration identity is the `(owner, id)` pair; duplicates are rejected.
- Readiness queries `_damat_migration_logs` and never creates a table.
- Missing tracker state and missing migration rows use the same actionable
  readiness error, with missing owner/id pairs retained as metadata.
