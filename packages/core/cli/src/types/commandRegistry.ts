import type { Command } from "./command";

export interface CommandRegistry {
  register(command: Command): void;
  get(name: string): Command | undefined;
  getAll(): Command[];
  has(name: string): boolean;
}
