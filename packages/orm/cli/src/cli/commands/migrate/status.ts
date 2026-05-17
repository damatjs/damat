import { Pool } from "@damatjs/deps/pg";
import type { Command, CommandContext, CommandResult } from "../../types";
import { getMigrationStatus, getModuleMigrationStatus } from "@damatjs/orm-migration";
import { requireDatabaseUrl } from "../../config";
import { resolvePaths } from "../../utils/paths";

const migrateStatus: Command = {
  name: "migrate:status",
  description: "Show migration status",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const [moduleName] = ctx.args;
    const { modulesDir, config } = ctx.options;
    const paths = resolvePaths(modulesDir, config ?? {}, moduleName);

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
        await showModuleStatus(ctx, pool, paths.modulesDir, moduleName);
      } else {
        await showAllStatus(ctx, pool, paths.modulesDir, ctx.options.activeModules);
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
  modulesDir: string,
  moduleName: string
): Promise<void> {
  const status = await getModuleMigrationStatus(pool, modulesDir, moduleName);
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
  modulesDir: string,
  activeModules?: string[]
): Promise<void> {
  const status = await getMigrationStatus(pool, modulesDir, activeModules);

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
