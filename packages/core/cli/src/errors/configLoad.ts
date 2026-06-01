import { CliError } from "./cli";

export class ConfigLoadError extends CliError {
  constructor(filePath: string, cause?: Error) {
    super(
      `Failed to load config from '${filePath}'${cause ? `: ${cause.message}` : ""}`,
      1
    );
    this.name = "ConfigLoadError";
  }
}
