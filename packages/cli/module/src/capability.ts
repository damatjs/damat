import { defineCliCapability } from "@damatjs/cli";
import { moduleCommand } from "./commands/module";

export const moduleCommands = [moduleCommand] as const;
export const moduleCliCapability = defineCliCapability({
  name: "module",
  commands: moduleCommands,
});
