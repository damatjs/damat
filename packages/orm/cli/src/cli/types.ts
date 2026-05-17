import type { DamatConfig } from "./config";
import type { ILogger } from "@damatjs/logger";

export interface CommandResult {
  exitCode: number;
}

export interface CommandContext {
  args: string[];
  options: CliOptions;
  logger: Logger;
}

export interface Command {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
  handler: (ctx: CommandContext) => Promise<CommandResult>;
}

export interface CommandRegistry {
  register(command: Command): void;
  get(name: string): Command | undefined;
  getAll(): Command[];
  has(name: string): boolean;
}

export interface CliOptions {
  modulesDir?: string | undefined;
  activeModules?: string[] | undefined;
  modelsDir?: string | undefined;
  migrationsDir?: string | undefined;
  typesDir?: string | undefined;
  config?: DamatConfig | undefined;
  verbose?: boolean;
}

export type Logger = ILogger;
