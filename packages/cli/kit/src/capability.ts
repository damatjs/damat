import { defineCliCapability } from "@damatjs/cli";
import { kitCommand } from "./commands/kit";

export const kitCommands = [kitCommand] as const;
export const kitCliCapability = defineCliCapability({
  name: "kit",
  commands: kitCommands,
});
