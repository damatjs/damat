import { CliError } from "./cli";

export class CommandNotFoundError extends CliError {
  constructor(commandName: string) {
    super(`Unknown command: ${commandName}`, 1);
    this.name = "CommandNotFoundError";
  }
}
