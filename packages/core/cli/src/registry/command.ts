import type { Command, CommandRegistry } from "../types";
import { CommandRegistrationError } from "../errors";

export class CommandRegistryImpl implements CommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(command: Command): void {
    if (this.commands.has(command.name)) {
      throw new CommandRegistrationError(
        command.name,
        "command already registered"
      );
    }
    this.commands.set(command.name, command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        if (this.commands.has(alias)) {
          throw new CommandRegistrationError(
            command.name,
            `alias '${alias}' already registered`
          );
        }
        this.commands.set(alias, command);
      }
    }

    if (command.subcommands) {
      for (const sub of command.subcommands) {
        this.register(sub);
      }
    }
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    const seen = new Set<string>();
    const unique: Command[] = [];

    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        unique.push(cmd);
      }
    }

    return unique;
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  clear(): void {
    this.commands.clear();
  }
}
