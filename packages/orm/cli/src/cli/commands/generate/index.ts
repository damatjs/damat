import type { Command } from "@damatjs/cli";
import generateTypes from "./types";

const generateCommand: Command = {
  name: "generate",
  description: "Code generation commands",
  subcommands: [generateTypes],
  handler: async (ctx) => {
    ctx.logger.info("Available generate subcommands: types");
    return { exitCode: 0 };
  },
};

export default generateCommand;
export { generateTypes };
