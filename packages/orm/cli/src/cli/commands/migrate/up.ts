import { Pool } from "@damatjs/deps/pg";
import type { Command, CommandContext, CommandResult } from "../../types";
import { runMigrations } from "@damatjs/orm-migration";
import { requireDatabaseUrl } from "../../config";

const migrateUp: Command = {
  name: "migrate:up",
  description: "Run all pending migrations",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const { config } = ctx.options;
    if (!config) {
      ctx.logger.error("config is required to be setup");
      console.log("");
      console.log("Usage: damat-orm migrate:create <module>");
      return { exitCode: 1 };
    }

    console.log("");
    ctx.logger.info("Running module migrations...");
    console.log("");

    const pool = new Pool({ connectionString: requireDatabaseUrl(ctx.logger) });
    try {
      const results = await runMigrations(pool, Object.values(config).map(m => m.resolve));
      const hasFailures = results.some((r) => !r.success);
      console.log("");

      if (hasFailures) {
        ctx.logger.error("Migration failed");
      } else {
        ctx.logger.success("Migration completed successfully");
      }

      return { exitCode: hasFailures ? 1 : 0 };
    } finally {
      await pool.end();
    }
  },
};

export default migrateUp;
