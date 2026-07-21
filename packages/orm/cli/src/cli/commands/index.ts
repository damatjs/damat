import type { Command } from "@damatjs/cli";
import databaseSetupCommand from "./database";
import migrateCommand from "./migrate";

// Codegen now lives in the damat CLI (`damat codegen` / `damat module codegen`)
// over `@damatjs/module-generator`. `damat-orm` is migrations only.
const allCommands: Command[] = [databaseSetupCommand, migrateCommand];

export { databaseSetupCommand, migrateCommand };

export default allCommands;
