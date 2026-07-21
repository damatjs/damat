import { type Command, reportError } from "@damatjs/cli";
import { runModuleMigration } from "@damatjs/module";

export const moduleMigrationRunCommand: Command = {
  name: "migration:run",
  description: "Apply this module's migrations to its DATABASE_URL",
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

      const result = await runModuleMigration(ctx.cwd);

      if (!result.hadMigrations) {
        ctx.logger.info(
          "No migrations found — run 'damat module migration:create' first",
        );
        return { exitCode: 0 };
      }

      if (!result.success) {
        reportError(ctx.logger, result.error ?? new Error("Migration failed"), {
          prefix: `Migration failed for "${result.moduleName}"`,
        });
        return { exitCode: 1 };
      }

      if (result.applied.length === 0) {
        ctx.logger.info("No pending migrations");
      } else {
        ctx.logger.success(
          `Applied ${result.applied.length} migration(s): ${result.applied.join(", ")}`,
        );
      }
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Could not run migrations" });
      return { exitCode: 1 };
    }
  },
};
