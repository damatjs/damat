import { reportError, type CommandContext } from "@damatjs/cli";
import { locateModuleDir, validateModuleDir } from "@damatjs/module";
import { runTypeCheck } from "@damatjs/cli-support";

export async function validatePublish(ctx: CommandContext): Promise<number> {
  const exitCode = await runTypeCheck({
    cwd: ctx.cwd,
    logger: ctx.logger,
    skip: ctx.options.typecheck === false,
    label: "module",
  });
  if (exitCode !== 0) return exitCode;
  if (ctx.options.validate === false) return 0;
  let moduleDir: string;
  try {
    moduleDir = locateModuleDir(ctx.cwd);
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Could not locate module" });
    return 1;
  }
  const report = validateModuleDir(moduleDir);
  for (const error of report.errors) ctx.logger.error(error);
  for (const warning of report.warnings) ctx.logger.warn(warning);
  return report.valid ? 0 : 1;
}
