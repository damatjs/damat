import type { Command } from "@damatjs/cli";
import { locateModuleDir, validateModuleDir } from "@damatjs/module";
import { reportModuleError } from "./shared";

export const moduleValidateCommand: Command = {
  name: "validate",
  description: "Check this module against the contract and registry readiness",
  handler: async (ctx) => {
    let moduleDir: string;
    try {
      moduleDir = locateModuleDir(ctx.cwd);
    } catch (e) {
      reportModuleError(ctx, e, "Could not locate module");
      return { exitCode: 1 };
    }

    const report = validateModuleDir(moduleDir);
    for (const error of report.errors) {
      ctx.logger.error(error);
    }
    for (const warning of report.warnings) {
      ctx.logger.warn(warning);
    }
    if (report.valid && report.warnings.length === 0) {
      ctx.logger.success(
        `Module "${report.manifest?.name}" is valid and registry-ready`,
      );
    } else if (report.valid) {
      ctx.logger.info("Module is valid — fix the warnings before publishing");
    }
    return { exitCode: report.valid ? 0 : 1 };
  },
};
