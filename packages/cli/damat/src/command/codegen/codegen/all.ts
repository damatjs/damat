import type { CommandContext } from "@damatjs/cli";
import { ModuleContainer } from "../constant";
import { runModuleCodegen } from "../runModule";


/** Generate for every module in the config, soft-skipping links and missing models. */
export async function codegenAll(ctx: CommandContext, modules: ModuleContainer) {
  const flat = Boolean(ctx.options.flat);
  let generated = 0;
  let failed = 0;

  for (const [moduleName, moduleConfig] of Object.entries(modules)) {
    try {
      const outcome = await runModuleCodegen({
        modules,
        moduleName,
        moduleConfig,
        cwd: ctx.cwd,
        flat,
        logger: ctx.logger,
        strict: false,
      });
      if (outcome === "generated") generated++;
    } catch (error) {
      failed++;
      ctx.logger.error(
        `Codegen failed for '${moduleName}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failed > 0) {
    ctx.logger.error(
      `Codegen completed with ${failed} failed module(s); ${generated} generated.`,
    );
    return { exitCode: 1 };
  }
  ctx.logger.success(`Codegen completed for ${generated} module(s)`);
  return { exitCode: 0 };
}

