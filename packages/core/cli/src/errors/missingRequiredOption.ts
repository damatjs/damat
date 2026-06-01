import { CliError } from "./cli";

export class MissingRequiredOptionError extends CliError {
  constructor(optionName: string, commandName: string) {
    super(
      `Missing required option '--${optionName}' for command '${commandName}'`,
      1
    );
    this.name = "MissingRequiredOptionError";
  }
}
