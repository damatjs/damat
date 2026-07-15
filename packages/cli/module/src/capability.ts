import { defineCliCapability } from "@damatjs/cli";
import { authCommand } from "./commands/auth";
import { moduleCommand } from "./commands/module";

export const moduleCommands = [moduleCommand] as const;
export const moduleCliCapability = defineCliCapability({
  name: "module",
  commands: moduleCommands,
});

export const authCommands = [authCommand] as const;
export const authCliCapability = defineCliCapability({
  name: "auth",
  commands: authCommands,
});
