import type { Command } from "@damatjs/cli";
import { moduleAddCommand } from "./add";
import { moduleRemoveCommand } from "./remove";
import { moduleUpdateCommand } from "./update";
import { moduleListCommand } from "./list";
import { moduleDevCommand } from "./dev";
import { moduleInitCommand } from "./init";
import { moduleMigrationCreateCommand } from "./migrationCreate";
import { moduleMigrationRunCommand } from "./migrationRun";
import { moduleMigrationStatusCommand } from "./migrationStatus";
import { moduleCodegenCommand } from "./codegen";
import { moduleValidateCommand } from "./validate";
import { moduleBuildCommand } from "./build";
import { modulePlanCommand } from "./plan";

export const moduleCommand: Command = {
  name: "module",
  description: "Author, run, and install self-contained modules",
  aliases: ["m"],
  subcommands: [
    moduleAddCommand,
    modulePlanCommand,
    moduleRemoveCommand,
    moduleUpdateCommand,
    moduleListCommand,
    moduleDevCommand,
    moduleInitCommand,
    moduleMigrationCreateCommand,
    moduleMigrationRunCommand,
    moduleMigrationStatusCommand,
    moduleCodegenCommand,
    moduleValidateCommand,
    moduleBuildCommand,
  ],
  handler: async (ctx) => {
    ctx.logger.info(
      [
        "Authoring (inside a module package):",
        "  damat module init <name>        Scaffold a standalone module package",
        "  damat module dev                Run the module as a live app",
        "  damat module migration:create   Diff models -> migration",
        "  damat module migration:run      Apply migrations to DATABASE_URL",
        "  damat module migration:status   Show applied vs pending migrations",
        "  damat module codegen            Generate row types + zod schemas",
        "  damat module validate           Contract + registry readiness check",
        "  damat module build              Type-check + contract validate for release",
        "",
        "App side (inside a backend):",
        "  damat module plan <source>      Preview without mutation",
        "  damat module add <source>       Install from registry, path, Git, npm, or tarball",
        "  damat module remove <id>        Remove an installed module (inverse of add)",
        "  damat module update <id>        Re-fetch a module from its recorded source",
        "  damat module list               List installed modules",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};

export {
  moduleAddCommand,
  modulePlanCommand,
  moduleRemoveCommand,
  moduleUpdateCommand,
  moduleListCommand,
  moduleDevCommand,
  moduleInitCommand,
  moduleMigrationCreateCommand,
  moduleMigrationRunCommand,
  moduleMigrationStatusCommand,
  moduleCodegenCommand,
  moduleValidateCommand,
  moduleBuildCommand,
};
