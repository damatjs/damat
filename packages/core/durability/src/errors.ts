export class DurabilityNotConfiguredError extends Error {
  constructor() {
    super("Durability client is not configured");
    this.name = "DurabilityNotConfiguredError";
  }
}

export interface MissingSystemMigration {
  owner: string;
  id: string;
}

export class DurableInfrastructureNotMigratedError extends Error {
  readonly missing: readonly MissingSystemMigration[];

  constructor(missing: readonly MissingSystemMigration[], cause?: unknown) {
    super("Durable infrastructure is not migrated. Run: bun run db:migrate", {
      cause,
    });
    this.name = "DurableInfrastructureNotMigratedError";
    this.missing = missing;
  }
}
