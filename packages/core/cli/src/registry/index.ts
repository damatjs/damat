import type { Command, CommandRegistry } from "../types";
import { CommandRegistryImpl } from './command';

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

export function clearRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
    registryInstance = null;
  }
}
