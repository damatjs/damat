import type { Command } from "../types";
import generateCommand, { generateTypesCommand } from "./generate";
import migrateCommand, { migrateUp, migrateStatus, migrateList, migrateCreate } from "./migrate";

const allCommands: Command[] = [generateCommand, migrateCommand];

export function registerAllCommands(): void {
  const { registerCommand } = require("../registry");
  for (const cmd of allCommands) {
    registerCommand(cmd);
  }
}

export {
  generateCommand,
  generateTypesCommand,
  migrateCommand,
  migrateUp,
  migrateStatus,
  migrateList,
  migrateCreate,
};

export default allCommands;
