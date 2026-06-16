import type { Command } from "@damatjs/cli";
import { createModuleMigration } from "@damatjs/module";

export const moduleMigrationCreateCommand: Command = {
  name: "migration:create",
  description: "Diff this module's models against its snapshot and create a migration",
  handler: async (ctx) => {
    try {
      const result = await createModuleMigration(ctx.cwd);
      if (result.hasChanges && result.filePath) {
        ctx.logger.success(`Migration created: ${result.filePath}`);
      } else {
        ctx.logger.info("No schema changes detected");
      }
      return { exitCode: 0 };
    } catch (e) {
      ctx.logger.error(e instanceof Error ? e.message : String(e));
      return { exitCode: 1 };
    }
  },
};
