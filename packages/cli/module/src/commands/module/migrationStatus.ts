import { type Command, reportError } from "@damatjs/cli";
import { runModuleMigrationStatus } from "@damatjs/module";

export const moduleMigrationStatusCommand: Command = {
  name: "migration:status",
  description: "Show which of this module's migrations are applied vs pending",
  handler: async (ctx) => {
    try {
      const { loadEnv } = await import("@damatjs/load-env");
      loadEnv(process.env.NODE_ENV || "development", ctx.cwd);

      if (!process.env.DATABASE_URL) {
        ctx.logger.error(
          "DATABASE_URL is not set — add it to your .env (see .env.example)",
        );
        return { exitCode: 1 };
      }

      const status = await runModuleMigrationStatus(ctx.cwd);

      if (!status.hadMigrations) {
        ctx.logger.info(
          "No migrations found — run 'damat module migration:create' first",
        );
        return { exitCode: 0 };
      }

      const headline = `${status.moduleName}: ${status.applied} applied, ${status.pending} pending`;
      ctx.logger[status.pending > 0 ? "info" : "success"](headline);

      for (const migration of status.migrations) {
        ctx.logger[migration.applied ? "success" : "info"](
          `  ${migration.applied ? "applied" : "pending"}  ${migration.name}`,
        );
      }

      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Could not read migration status" });
      return { exitCode: 1 };
    }
  },
};
