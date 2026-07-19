import { type Command, reportError } from "@damatjs/cli";
import { ensurePostgresDatabase } from "@/database";
import { loadDatabaseUrl } from "@/cli/utils/load";
import migrateUp from "../migrate/up";

const databaseSetup: Command = {
  name: "database:setup",
  description: "Create the configured PostgreSQL database and apply migrations",
  handler: async (ctx) => {
    let databaseUrl: string;
    try {
      databaseUrl = (await loadDatabaseUrl("damat.config.ts", ctx.cwd))
        .databaseUrl;
      if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
      const result = await ensurePostgresDatabase(databaseUrl);
      ctx.logger[result.created ? "success" : "info"](
        result.created
          ? "PostgreSQL database created"
          : "PostgreSQL database already exists",
      );
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Database setup failed" });
      return { exitCode: 1 };
    }
    return migrateUp.handler(ctx);
  },
};

export default databaseSetup;
