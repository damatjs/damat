# Durability internals

## Package map

| Path                          | Responsibility                                      |
| ----------------------------- | --------------------------------------------------- |
| `src/client/types.ts`         | Structural executor, pool, and client contracts     |
| `src/coordinator/`            | Process-level adaptive background-work coordinator  |
| `src/acceleration/`           | Transactional outbox, health, rebuild, invalidation |
| `src/retention/`              | Audited runtime retention overrides                 |
| `src/client/create.ts`        | Transaction runner with commit, rollback, release   |
| `src/client/global.ts`        | Process-wide optional default client                |
| `src/client/transactional.ts` | Active transaction executor marker and helpers      |
| `src/idempotency/`            | Transactional claim, replay, completion, JSON gate  |
| `src/workers/`                | Observational worker presence and stale-state views |
| `src/controls/`               | Atomic pause state and immutable operator activity  |
| `src/logs/`                   | Immutable redaction and bounded newest log history  |
| `src/inspection/`             | Cursor, filter, visibility, progress, time buckets  |
| `src/leases/`                 | UUID lease-token creation                           |
| `src/migrations/types.ts`     | System migration and catalog contracts              |
| `src/migrations/catalog.ts`   | Catalog validation, deduplication, and ordering     |
| `src/migrations/shared-*`     | Shared `_damat_` table descriptors                  |
| `src/migrations/readiness.ts` | Read-only applied-migration validation              |
| `src/errors.ts`               | Setup and migration-readiness errors                |

## Invariants

- The package never opens a PostgreSQL pool; callers own pool lifecycle.
- Redis never owns canonical state. Its projections are safe to discard and
  rebuild from committed PostgreSQL records.
- A client transaction always releases its checked-out connection.
- Only active Damat transaction callbacks expose fresh executor wrappers.
- Wrappers are invalidated after both successful and failed callbacks.
- Invalidated wrappers reject queries before delegating to their client.
- Reusing an underlying client never reactivates an older wrapper.
- After-commit callbacks run only after the transaction owner confirms commit.
- Multiple acceleration signals in one transaction request one relay flush.
- Rollback discards every registered after-commit callback.
- `withIdempotency` rejects an unmarked supplied executor before querying.
- An idempotency claim, operation, and completion share one transaction.
- Completed duplicates replay the stored JSON result without rerunning work.
- Expired idempotency cleanup is ordered and bounded to at most 500 rows.
- Database idempotency does not claim exactly-once remote side effects.
- Worker registry state is observational; fenced leases remain authoritative.
- Heartbeat age is calculated at inspection time from a caller-selected clock.
- Stopping and stopped worker transitions are distinct and preserve first times.
- Pause state is unique by work kind and scope.
- Administration validates a nonblank actor and supported actor type before SQL.
- Every pause or resume shares a transaction with its immutable activity row.
- Control activity identity follows the serialized control-write order.
- A supplied control executor must be an active Damat transaction executor.
- Redaction clones arrays and objects instead of mutating handler-owned values.
- Log limiting retains one contiguous newest suffix and reports truncation.
- Log count and byte limits are finite nonnegative integers.
- Cursors require an explicit nonempty HMAC key and canonical ISO
  timestamp/UUID values.
- Cursor signatures are verified before version and position decoding.
- Cursor ordering uses timestamp first and UUID as the stable tie breaker.
- Summary ranges are half-open, use valid dates and safe-integer intervals, and
  intersect at most 1,000 buckets; optional clocks and stale thresholds are
  validated too.
- Progress terminal values are recorded regardless of the sampling interval.
- Catalog owners must match every migration they contain.
- Migration identity is the `(owner, id)` pair; duplicates are rejected.
- Readiness queries `_damat_migration_logs` and never creates a table.
- Missing tracker state and missing migration rows use the same actionable
  readiness error, with missing owner/id pairs retained as metadata.
