import type { Command } from "@damatjs/cli";
import generateCommand, { generateTypes } from "./generate";
import migrateCommand, { migrateUp, migrateStatus, migrateList, migrateCreate } from "./migrate";

const allCommands: Command[] = [
  generateCommand,
  generateTypes,
  migrateCommand,
  migrateUp,
  migrateStatus,
  migrateList,
  migrateCreate,
];

export {
  generateCommand,
  generateTypes,
  migrateCommand,
  migrateUp,
  migrateStatus,
  migrateList,
  migrateCreate,
};

export default allCommands;
