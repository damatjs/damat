import type { Command } from "@damatjs/cli";
import { handleModuleList } from "./handler";

export const moduleListCommand: Command = {
  name: "list",
  description: "List modules installed in this app",
  aliases: ["ls"],
  options: [],
  handler: handleModuleList,
};
