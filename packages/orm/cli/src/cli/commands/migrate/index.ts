import type { Command, CommandContext, CommandResult } from "../../types";
import migrateUp from "./up";
import migrateStatus from "./status";
import migrateList from "./list";
import migrateCreate from "./create";

const commands = [migrateUp, migrateStatus, migrateList, migrateCreate];

const migrateComposite: Command = {
  name: "migrate",
  description: "Database migration commands",
  usage: "migrate <subcommand> [args...]",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const [subcommandName, ...subArgs] = ctx.args;

    if (!subcommandName || subcommandName === "help" || subcommandName === "--help") {
      printHelp(ctx);
      return { exitCode: 0 };
    }

    const subcommand = commands.find(
      (cmd) => cmd.name === `migrate:${subcommandName}` || cmd.name === subcommandName
    );

    if (!subcommand) {
      ctx.logger.error(`Unknown migrate command: ${subcommandName}`);
      console.log("");
      printHelp(ctx);
      return { exitCode: 1 };
    }

    return subcommand.handler({ ...ctx, args: subArgs });
  },
};

function printHelp(ctx: CommandContext): void {
  console.log("");
  ctx.logger.info("migrate commands:");
  console.log("");
  for (const cmd of commands) {
    console.log(`  ${cmd.name.replace("migrate:", "").padEnd(15)} ${cmd.description}`);
  }
  console.log("");
}

const migrateCommand: Command = {
  name: "migrate",
  description: "Database migration commands",
  handler: migrateComposite.handler,
};

export default migrateCommand;
export { migrateUp, migrateStatus, migrateList, migrateCreate, migrateComposite };
