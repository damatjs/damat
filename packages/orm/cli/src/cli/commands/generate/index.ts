import type { Command } from "@damatjs/cli";
import generateTypes from "./types";

const commands = [generateTypes];

const generateCommand: Command = {
  name: "generate",
  description: "Code generation commands",
  subcommands: commands,
  handler: async (ctx) => {
    ctx.logger.info("Available generate subcommands: types");
    return { exitCode: 0 };
  },
};

export default generateCommand;
export { generateTypes };
