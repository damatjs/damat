import { BannerConfig } from "./banner";
import type { Command } from "./command";
import type { CommandContext } from "./command";

export type HelpTemplateFn = (
  definition: CliDefinition,
  commands: Command[],
) => string;

export type ErrorHandlerFn = (
  error: Error,
  ctx: CommandContext | Partial<CommandContext>,
) => void;

export interface VerboseConfig {
  enabled?: boolean;
  handler?: "auto" | "manual";
}

export interface ConfigLoader {
  file?: string | string[];
  load?: (filePath: string) => Promise<unknown>;
}

export interface CliDefinition {
  name: string;
  version: string;
  description?: string;
  commands: Command[];
  /**
   * Name (or alias) of a command to fall back to when the first argument is not
   * a known command — so `mytool <arg>` behaves like `mytool <defaultCommand>
   * <arg>`. Used by single-purpose CLIs (e.g. `create-tool my-app`).
   * The whole argument list is passed to the default command.
   */
  defaultCommand?: string;
  banner?: BannerConfig | false;
  helpTemplate?: HelpTemplateFn;
  verbose?: VerboseConfig;
  configLoader?: ConfigLoader;
  onError?: ErrorHandlerFn;
}
