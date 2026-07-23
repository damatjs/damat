import type { Command } from "@damatjs/cli";
import { generateModuleTypes } from "@damatjs/module";
import { asToolingLogger } from "../../toolingLogger";
import { reportModuleError } from "./shared";

export const moduleCodegenCommand: Command = {
  name: "codegen",
  description:
    "Generate row types + zod + registry and scaffold-once CRUD (steps, workflows, routes) for this module package",
  handler: async (ctx) => {
    try {
      const result = await generateModuleTypes(
        ctx.cwd,
        asToolingLogger(ctx.logger),
      );
      ctx.logger.success(
        `Generated ${result.files.length} type files in ${result.outputDir}`,
      );
      if (result.scaffolded.length > 0) {
        ctx.logger.success(
          `Scaffolded ${result.scaffolded.length} CRUD files (steps, workflows, routes)`,
        );
      }
      return { exitCode: 0 };
    } catch (e) {
      reportModuleError(ctx, e, "Codegen failed");
      return { exitCode: 1 };
    }
  },
};
