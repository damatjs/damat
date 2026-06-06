import type { Command } from "@damatjs/cli";
import generateCommand from "./generate";
import migrateCommand from "./migrate";

const allCommands: Command[] = [
  generateCommand,
  migrateCommand,
];

export {
  generateCommand,
  migrateCommand,
};

export default allCommands;
