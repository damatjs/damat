import { defineCliCapability, type Command } from "@damatjs/cli";
import { barrelCommand } from "./commands/barrel";
import { codegenCommand } from "./commands/codegen";

export const codegenCommands: readonly Command[] = [
  codegenCommand,
  barrelCommand,
];

export const codegenCliCapability = defineCliCapability({
  name: "codegen",
  commands: codegenCommands,
});
