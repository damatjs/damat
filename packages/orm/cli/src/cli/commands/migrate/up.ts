import { Pool } from "@damatjs/deps/pg";
import type { Command, CommandContext, CommandResult } from "../../types";
import { runMigrations } from "@damatjs/orm-migration";
import { requireDatabaseUrl } from "../../config";
import { resolvePaths } from "../../utils/paths";

const migrateUp: Command = {
  name: "migrate:up",
  description: "Run all pending migrations",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const { modulesDir, config } = ctx.options;
    const paths = resolvePaths(modulesDir, config ?? {});

    console.log("");
    ctx.logger.info("Running module migrations...");
    console.log("");

    const pool = new Pool({ connectionString: requireDatabaseUrl(ctx.logger) });
    try {
      const results = await runMigrations(pool, paths.modulesDir, ctx.options.activeModules);
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
