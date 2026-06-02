import type { ILogger } from "@damatjs/logger";
import type { DamatConfig } from "./config";

export type { Command, CommandContext, CommandResult, CommandOption } from "@damatjs/cli";

export interface OrmCliOptions {
  activeModules?: string[];
  config?: DamatConfig;
  verbose?: boolean;
}

export type Logger = ILogger;
