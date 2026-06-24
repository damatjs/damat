import { join } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";
import { ModuleContainer } from "../constant";
import { runModuleCodegen } from "../runModule";


/** Generate for a single, explicitly named module (strict: missing models fails). */
export async function codegenOne(
  ctx: CommandContext,
  modules: ModuleContainer,
  moduleName: string,
) {
  const moduleConfig = modules[moduleName];
  if (!moduleConfig) {
    ctx.logger.error(`Module '${moduleName}' not found in config`);
    return { exitCode: 1 };
  }

  try {
    const outcome = await runModuleCodegen({
      modules,
      moduleName,
      moduleConfig,
      cwd: ctx.cwd,
      flat: Boolean(ctx.options.flat),
      logger: ctx.logger,
      strict: true,
    });
    if (outcome === "error") return { exitCode: 1 };
    // Rebuild the cross-module workflow barrels so the bare `@workflows` re-exports
    // this module alongside the others already present.
    generateBarrels(join(ctx.cwd, "src", "workflows"), ctx.logger);
    if (outcome === "generated") ctx.logger.success("Codegen completed");
    return { exitCode: 0 };
  } catch (error) {
    ctx.logger.error(
      `Codegen failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { exitCode: 1 };
  }
}
