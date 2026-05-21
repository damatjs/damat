export { runCli, getRegistry, registerCommand, getCommand, getAllCommands } from "./cli/index";
export { registerAllCommands } from "./cli/commands/index";
export { loadConfig, type DamatConfig } from "./cli/config";
export type { Command, CommandContext, CommandResult, CommandRegistry, CliOptions, Logger } from "./cli/types";
