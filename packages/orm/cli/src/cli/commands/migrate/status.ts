import { Pool } from "@damatjs/deps/pg";
import type { Command, CommandContext, CommandResult } from "../../types";
import { getMigrationStatus, getModuleMigrationStatus } from "@damatjs/orm-migration";
import { requireDatabaseUrl } from "../../config";

const migrateStatus: Command = {
  name: "migrate:status",
  description: "Show migration status",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const [moduleName] = ctx.args;
    const { config } = ctx.options;


    if (!moduleName) {
      ctx.logger.error("Module name is required");
      console.log("");
      console.log("Usage: damat-orm migrate:create <module>");
      return { exitCode: 1 };
    }
    if (!config) {
      ctx.logger.error("config is required to be setup");
      console.log("");
      console.log("Usage: damat-orm migrate:create <module>");
      return { exitCode: 1 };
    }
    const module = config[moduleName];
    if (!module) {
      ctx.logger.error(`Module '${moduleName}' not found in config`);
      return { exitCode: 1 };
    }


    console.log("");
    if (moduleName) {
      ctx.logger.info(`Checking migration status for module '${moduleName}'...`);
    } else {
      ctx.logger.info("Checking migration status...");
    }
    console.log("");

    const pool = new Pool({ connectionString: requireDatabaseUrl(ctx.logger) });
    try {
      if (moduleName) {
        await showModuleStatus(ctx, pool, module.resolve);
      } else {
        await showAllStatus(ctx, pool, Object.values(config).map(m => m.resolve));
      }

      console.log("");
      return { exitCode: 0 };
    } finally {
      await pool.end();
    }
  },
};

async function showModuleStatus(
  ctx: CommandContext,
  pool: Pool,
  moduleResolver: string,
): Promise<void> {
  const status = await getModuleMigrationStatus(pool, moduleResolver);
  const mod = status.module;

  ctx.logger[mod.pending > 0 ? "warn" : "success"](
    `${mod.name}: ${mod.applied} applied, ${mod.pending} pending`
  );

  for (const m of mod.migrations) {
    ctx.logger[m.applied ? "success" : "warn"](`  ${m.name}`);
  }
}

async function showAllStatus(
  ctx: CommandContext,
  pool: Pool,
  moduleResolvers: string[]
): Promise<void> {
  const status = await getMigrationStatus(pool, moduleResolvers);

  if (status.modules.length === 0) {
    ctx.logger.skip("No modules with migrations found.");
    return;
  }

  for (const mod of status.modules) {
    ctx.logger[mod.pending > 0 ? "warn" : "success"](
      `${mod.name}: ${mod.applied} applied, ${mod.pending} pending`
    );

    for (const m of mod.migrations) {
      ctx.logger[m.applied ? "success" : "warn"](`  ${m.name}`);
    }
  }
}

export default migrateStatus;
