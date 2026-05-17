import type { Command, CommandContext, CommandResult } from "../../types";
import generateTypesCommand from "./types";

const commands = [generateTypesCommand];

const generateComposite: Command = {
  name: "generate",
  description: "Code generation commands",
  usage: "generate <subcommand> [args...]",
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const [subcommandName, ...subArgs] = ctx.args;

    if (!subcommandName || subcommandName === "help" || subcommandName === "--help") {
      printHelp(ctx);
      return { exitCode: 0 };
    }

    const subcommand = commands.find(
      (cmd) => cmd.name === `generate:${subcommandName}` || cmd.name === subcommandName
    );

    if (!subcommand) {
      ctx.logger.error(`Unknown generate command: ${subcommandName}`);
      console.log("");
      printHelp(ctx);
      return { exitCode: 1 };
    }

    return subcommand.handler({ ...ctx, args: subArgs });
  },
};

function printHelp(ctx: CommandContext): void {
  console.log("");
  ctx.logger.info("generate commands:");
  console.log("");
  for (const cmd of commands) {
    console.log(`  ${cmd.name.replace("generate:", "").padEnd(15)} ${cmd.description}`);
  }
  console.log("");
}

const generateCommand: Command = {
  name: "generate",
  description: "Code generation commands",
  handler: generateComposite.handler,
};

export default generateCommand;
export { generateTypesCommand };
