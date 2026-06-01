import { CliError } from "./cli";

export class CommandRegistrationError extends CliError {
  constructor(commandName: string, reason: string) {
    super(`Failed to register command '${commandName}': ${reason}`, 1);
    this.name = "CommandRegistrationError";
  }
}
