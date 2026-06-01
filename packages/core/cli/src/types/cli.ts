import { BannerConfig } from './banner';
import type { Command } from "./command";
import type { CommandContext } from "./command";

export type HelpTemplateFn = (
  config: CliConfig,
  commands: Command[]
) => string;

export type ErrorHandlerFn = (
  error: Error,
  ctx: CommandContext | Partial<CommandContext>
) => void;

export interface VerboseConfig {
  enabled?: boolean;
  handler?: "auto" | "manual";
}

export interface ConfigLoader {
  file?: string | string[];
  load?: (filePath: string) => Promise<unknown>;
}

export interface CliConfig {
  name: string;
  version: string;
  description?: string;
  commands: Command[];
  banner?: BannerConfig | false;
  helpTemplate?: HelpTemplateFn;
  verbose?: VerboseConfig;
  configLoader?: ConfigLoader;
  onError?: ErrorHandlerFn;
}
