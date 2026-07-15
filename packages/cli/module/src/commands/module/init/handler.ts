import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "@damatjs/cli";
import { scaffoldModule } from "./scaffold";

const MODULE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const handleModuleInit: Command["handler"] = async (ctx) => {
  const name = ctx.args[0];
  if (!name || !MODULE_NAME_PATTERN.test(name)) {
    ctx.logger.error(
      "Usage: damat module init <name>   (kebab-case, e.g. user-management)",
    );
    return { exitCode: 1 };
  }
  const targetDir = join(ctx.cwd, (ctx.options.dir as string) || name);
  if (existsSync(targetDir)) {
    ctx.logger.error(`${targetDir} already exists`);
    return { exitCode: 1 };
  }
  scaffoldModule(targetDir, name);
  ctx.logger.success(`Module package created at ${targetDir}`);
  ctx.logger.info(
    [
      "Wrote README.md + AGENTS.md (read AGENTS.md — it's the full authoring guide).",
      "",
      "Next steps:",
      `  cd ${name} && bun install`,
      "  # add models in src/models, service logic in src/service.ts",
      "  bun run migration:create   # generate the schema migration",
      "  bun run codegen            # generate row types + zod schemas",
      "  bun run dev                # run the module standalone",
      "  bun test                   # contract + service + api tests",
    ].join("\n"),
  );
  return { exitCode: 0 };
};
