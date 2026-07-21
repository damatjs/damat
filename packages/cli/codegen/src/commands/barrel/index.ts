import { join } from "node:path";
import { type Command, reportError } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/module-generator";
import { asToolingLogger } from "../../toolingLogger";

/**
 * Recursively (re)write `index.ts` barrels in a directory tree so a single bare
 * import (`@workflows`) re-exports everything beneath it. Each folder gets
 * an `index.ts` doing `export * from "./<child>"` for every sub-folder and
 * sibling file. Codegen and `damat module add` run this automatically over
 * `src/workflows`; this command is the manual entry point (e.g. after hand-adding
 * a workflow file). Defaults to `src/workflows`.
 */
export const barrelCommand: Command = {
  name: "barrel",
  description:
    "Recursively (re)generate index.ts barrels so one import re-exports a whole tree (default: src/workflows)",
  usage: "damat barrel [dir]",
  examples: [
    "damat barrel                       # src/workflows",
    "damat barrel src/workflows",
  ],
  handler: async (ctx) => {
    const dir = (ctx.args[0] as string) ?? join("src", "workflows");
    const target = join(ctx.cwd, dir);
    try {
      const { written } = generateBarrels(target, asToolingLogger(ctx.logger));
      if (written.length === 0) {
        ctx.logger.warn(
          `Nothing to barrel — ${dir} is missing or not a directory`,
        );
        return { exitCode: 0 };
      }
      ctx.logger.success(
        `Wrote ${written.length} index.ts barrel(s) under ${dir}`,
      );
      return { exitCode: 0 };
    } catch (e) {
      reportError(ctx.logger, e, { prefix: "Barrel generation failed" });
      return { exitCode: 1 };
    }
  },
};

export default barrelCommand;
