import { type Command, reportError } from "@damatjs/cli";
import { locateModuleDir, validateModuleDir } from "@damatjs/module";
import { runTypeCheck } from "../shared/typecheck";

/**
 * Build a standalone module: a verification gate, not a bundle. A module ships
 * as source (`damat module add` relocates it), so "build" means it must
 * **compile** (type-check) and be a **valid, installable** module (contract +
 * registry readiness). Either failure exits non-zero.
 */
export const moduleBuildCommand: Command = {
  name: "build",
  description: "Type-check and contract-validate this module for release",
  aliases: ["b"],
  usage: "damat module build [--no-typecheck] [--no-validate]",
  options: [
    {
      name: "typecheck",
      type: "boolean",
      description: "Type-check the module before validating (use --no-typecheck to skip)",
      default: true,
    },
    {
      name: "validate",
      type: "boolean",
      description: "Check the module.json contract + registry readiness (use --no-validate to skip)",
      default: true,
    },
  ],
  handler: async (ctx) => {
    // 1. Compile correctness — fail fast on any type error in the module source.
    const typecheckExit = await runTypeCheck({
      cwd: ctx.cwd,
      logger: ctx.logger,
      skip: ctx.options.typecheck === false,
      label: "module",
    });
    if (typecheckExit !== 0) {
      return { exitCode: typecheckExit };
    }

    // 2. Contract + registry readiness — the module must be installable.
    if (ctx.options.validate !== false) {
      let moduleDir: string;
      try {
        moduleDir = locateModuleDir(ctx.cwd);
      } catch (e) {
        reportError(ctx.logger, e, { prefix: "Could not locate module" });
        return { exitCode: 1 };
      }

      const report = validateModuleDir(moduleDir);
      for (const error of report.errors) {
        ctx.logger.error(error);
      }
      for (const warning of report.warnings) {
        ctx.logger.warn(warning);
      }
      if (!report.valid) {
        return { exitCode: 1 };
      }
    }

    ctx.logger.success("Module build OK");
    return { exitCode: 0 };
  },
};
