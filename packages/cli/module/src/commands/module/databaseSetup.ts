import type { Command } from "@damatjs/cli";
import { ensurePostgresDatabase } from "@damatjs/orm-cli";
import { moduleMigrationRunCommand } from "./migrationRun";
import { reportModuleError } from "./shared";

interface SetupDependencies {
  ensure: typeof ensurePostgresDatabase;
  migrate: Command["handler"];
}

export async function loadModuleDatabaseUrl(cwd: string): Promise<string> {
  const { loadEnv } = await import("@damatjs/load-env");
  loadEnv(process.env.NODE_ENV || "development", cwd);
  return process.env.DATABASE_URL ?? "";
}

export function createModuleDatabaseSetupCommand(
  dependencies: SetupDependencies = {
    ensure: ensurePostgresDatabase,
    migrate: moduleMigrationRunCommand.handler,
  },
): Command {
  return {
    name: "database:setup",
    description:
      "Create the module database and apply this module's migrations",
    handler: async (ctx) => {
      try {
        const databaseUrl = await loadModuleDatabaseUrl(ctx.cwd);
        if (!databaseUrl) throw new Error("DATABASE_URL is not set");
        const result = await dependencies.ensure(databaseUrl);
        ctx.logger[result.created ? "success" : "info"](
          result.created
            ? "Module PostgreSQL database created"
            : "Module PostgreSQL database already exists",
        );
      } catch (error) {
        reportModuleError(ctx, error, "Module database setup failed");
        return { exitCode: 1 };
      }
      return dependencies.migrate(ctx);
    },
  };
}

export const moduleDatabaseSetupCommand = createModuleDatabaseSetupCommand();
