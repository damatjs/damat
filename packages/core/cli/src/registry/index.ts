import type { CommandRegistry } from "../types";
import { CommandRegistryImpl } from "./command";

export { CommandRegistryImpl } from "./command";

export function createCommandRegistry(): CommandRegistry {
  return new CommandRegistryImpl();
}
