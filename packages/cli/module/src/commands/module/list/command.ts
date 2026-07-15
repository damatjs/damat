import type { Command } from "@damatjs/cli";
import { handleModuleList } from "./handler";

export const moduleListCommand: Command = {
  name: "list",
  description: "List modules installed in this app",
  aliases: ["ls"],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Modules directory to scan",
      default: "src/modules",
    },
  ],
  handler: handleModuleList,
};
