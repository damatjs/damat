import type { Command } from "./command";

export interface CliCapability {
  name: string;
  commands: readonly Command[];
}
