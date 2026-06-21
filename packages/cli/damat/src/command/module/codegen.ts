import { type Command, reportError } from "@damatjs/cli";
import { generateModuleTypes } from "@damatjs/module";

export const moduleCodegenCommand: Command = {
  name: "codegen",
  description: "Generate row types + zod schemas for this module package",
  handler: async (ctx) => {
    try {
      const result = await generateModuleTypes(ctx.cwd, ctx.logger);
      ctx.logger.success(
        `Generated ${result.files.length} files in ${result.outputDir}`,
      );
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Codegen failed" });
      return { exitCode: 1 };
    }
  },
};
