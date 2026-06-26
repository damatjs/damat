import type { Command } from "@damatjs/cli";
import { moduleAddCommand } from "./add";
import { moduleListCommand } from "./list";
import { moduleDevCommand } from "./dev";
import { moduleInitCommand } from "./init";
import { moduleMigrationCreateCommand } from "./migrationCreate";
import { moduleCodegenCommand } from "./codegen";
import { moduleValidateCommand } from "./validate";
import { moduleBuildCommand } from "./build";
import { moduleLinkSetupCommand } from "./linkSetup";

export const moduleCommand: Command = {
  name: "module",
  description: "Author, run, and install self-contained modules",
  aliases: ["m"],
  subcommands: [
    moduleAddCommand,
    moduleListCommand,
    moduleDevCommand,
    moduleInitCommand,
    moduleMigrationCreateCommand,
    moduleCodegenCommand,
    moduleValidateCommand,
    moduleBuildCommand,
    moduleLinkSetupCommand,
  ],
  handler: async (ctx) => {
    ctx.logger.info(
      [
        "Authoring (inside a module package):",
        "  damat module init <name>        Scaffold a standalone module package",
        "  damat module dev                Run the module as a live app",
        "  damat module migration:create   Diff models -> migration",
        "  damat module codegen            Generate row types + zod schemas",
        "  damat module validate           Contract + registry readiness check",
        "  damat module build              Type-check + contract validate for release",
        "",
        "App side (inside a backend):",
        "  damat module add <source>       Install from registry ref, path, or git",
        "  damat module list               List installed modules",
        "  damat module link-setup         Materialize link drafts into src/links/",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};

export {
  moduleAddCommand,
  moduleListCommand,
  moduleDevCommand,
  moduleInitCommand,
  moduleMigrationCreateCommand,
  moduleCodegenCommand,
  moduleValidateCommand,
  moduleBuildCommand,
  moduleLinkSetupCommand,
};
