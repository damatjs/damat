import type { Command, CommandRegistry } from "@damatjs/cli";

class CommandRegistryImpl implements CommandRegistry {
  private commands: Map<string, Command> = new Map();

  register(command: Command): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`);
    }
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }
}

let registryInstance: CommandRegistryImpl | null = null;

export function getRegistry(): CommandRegistry {
  if (!registryInstance) {
    registryInstance = new CommandRegistryImpl();
  }
  return registryInstance;
}

export function registerCommand(command: Command): void {
  getRegistry().register(command);
}

export function getCommand(name: string): Command | undefined {
  return getRegistry().get(name);
}

export function getAllCommands(): Command[] {
  return getRegistry().getAll();
}
