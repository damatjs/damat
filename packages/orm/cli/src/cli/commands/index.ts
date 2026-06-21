import type { Command } from "@damatjs/cli";
import migrateCommand from "./migrate";

// Codegen now lives in the damat CLI (`damat codegen` / `damat module codegen`)
// over the agnostic `@damatjs/codegen` core. `damat-orm` is migrations only.
const allCommands: Command[] = [migrateCommand];

export { migrateCommand };

export default allCommands;
