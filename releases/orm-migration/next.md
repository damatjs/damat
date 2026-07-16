# @damatjs/orm-migration Unreleased

## Changed

Migration discovery prefers a resolved module's explicit `migrations`
directory, including all-module listing. Model discovery accepts aggregate
exports and file-per-model provider directories.

`runMigrations` and `getMigrationStatus` accept optional system migrations.
System SQL runs before modules under the existing advisory lock and is tracked
by owner and migration id in `_damat_migration_logs`. The system SQL and tracker
row commit in the same transaction.

## Action required

String callers continue to use `<resolver>/migrations`. Callers enabling
durable infrastructure must pass its collected system migrations.
