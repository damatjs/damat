import type { Command, CommandRegistry } from "../types";
import { CommandRegistrationError } from "../errors";

export class CommandRegistryImpl implements CommandRegistry {
  private commands: Map<string, Command>;

  constructor() {
    this.commands = new Map();
  }

  register(command: Command, prefix = ""): void {
    // Subcommands are namespaced under their parent ("module:dev") so they
    // can't collide with top-level commands ("dev"). Names that already
    // carry the parent prefix ("migrate:up" under "migrate") are kept as-is.
    const name =
      prefix && !command.name.startsWith(`${prefix}:`)
        ? `${prefix}:${command.name}`
        : command.name;

    if (this.commands.has(name)) {
      throw new CommandRegistrationError(name, "command already registered");
    }
    this.commands.set(name, command);

    if (command.aliases) {
      for (const alias of command.aliases) {
        const aliasName = prefix ? `${prefix}:${alias}` : alias;
        if (this.commands.has(aliasName)) {
          throw new CommandRegistrationError(
            name,
            `alias '${aliasName}' already registered`
          );
        }
        this.commands.set(aliasName, command);
      }
    }

    if (command.subcommands) {
      for (const sub of command.subcommands) {
        this.register(sub, name);
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
