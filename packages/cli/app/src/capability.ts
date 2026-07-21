import { defineCliCapability } from "@damatjs/cli";
import {
  buildCommand,
  cloneCommand,
  createCommand,
  devCommand,
  startCommand,
} from "./commands";

export const appCommands = [
  createCommand,
  cloneCommand,
  devCommand,
  startCommand,
  buildCommand,
] as const;

export const appCliCapability = defineCliCapability({
  name: "app",
  commands: appCommands,
});
