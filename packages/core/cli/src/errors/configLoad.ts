import { CliError } from "./cli";

export class ConfigLoadError extends CliError {
  constructor(filePath: string, cause?: Error) {
    super(`Failed to load config from '${filePath}'`, 1);
    this.name = "ConfigLoadError";
    // Keep the underlying error as a real `cause` so error reporters can show
    // it (and its stack) instead of flattening it into the message.
    if (cause) (this as Error).cause = cause;
  }
}
