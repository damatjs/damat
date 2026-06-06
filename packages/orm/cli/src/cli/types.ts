import type { ILogger } from "@damatjs/logger";
import type { OrmModuleContainer, OrmModule } from "@damatjs/orm-type";

export type {
  Command,
  CommandContext,
  CommandResult,
  CommandOption,
} from "@damatjs/cli";

/** Map returned by loadModules — keyed by module id. */
export type ModulesMap = Record<string, { resolve: string }>;

export interface OrmCliOptions {
  activeModules?: string[];
  config?: ModulesMap;
  verbose?: boolean;
}

export type Logger = ILogger;

export type { OrmModuleContainer, OrmModule };
