import { reportError, type Command } from "@damatjs/cli";
import { resolveModuleSource } from "../helpers";
import { reportAddDryRun } from "./dryRun";
import { installPreparedModule } from "./install";
import { prepareAdd } from "./prepare";

export const handleModuleAdd: Command["handler"] = async (ctx) => {
  const source = ctx.args[0];
  if (!source) {
    ctx.logger.error("Usage: damat module add <source>");
    return { exitCode: 1 };
  }
  let resolved;
  try {
    resolved = await resolveModuleSource(source, ctx.cwd);
  } catch (error) {
    reportError(ctx.logger, error, {
      prefix: "Could not resolve module source",
    });
    return { exitCode: 1 };
  }
  try {
    const state = prepareAdd(ctx, resolved);
    if (!state) return { exitCode: 1 };
    if (ctx.options["dry-run"]) {
      reportAddDryRun(ctx, state);
      return { exitCode: 0 };
    }
    return { exitCode: installPreparedModule(ctx, state) ? 0 : 1 };
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Failed to add module" });
    return { exitCode: 1 };
  } finally {
    resolved.cleanup();
  }
};
