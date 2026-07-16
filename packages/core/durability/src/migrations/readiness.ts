import { DurableInfrastructureNotMigratedError } from "../errors";
import type { DurabilityExecutor } from "../client/types";
import type { SystemMigration } from "./types";

interface AppliedSystemMigration {
  owner: string;
  id: string;
}

function isMissingTracker(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return (
    code === "42P01" ||
    /_damat_migration_logs.*does not exist/i.test(error.message)
  );
}

export async function assertSystemMigrationsApplied(
  executor: DurabilityExecutor,
  migrations: readonly SystemMigration[],
): Promise<void> {
  let applied: AppliedSystemMigration[];
  try {
    const result = await executor.query<AppliedSystemMigration>(
      `SELECT module AS owner, name AS id
       FROM "_damat_migration_logs"
       WHERE status = 'applied'`,
    );
    applied = result.rows;
  } catch (cause) {
    if (!isMissingTracker(cause)) throw cause;
    throw new DurableInfrastructureNotMigratedError(
      migrations.map(({ owner, id }) => ({ owner, id })),
      cause,
    );
  }
  const keys = new Set(applied.map(({ owner, id }) => `${owner}:${id}`));
  const missing = migrations
    .filter(({ owner, id }) => !keys.has(`${owner}:${id}`))
    .map(({ owner, id }) => ({ owner, id }));
  if (missing.length) throw new DurableInfrastructureNotMigratedError(missing);
}
