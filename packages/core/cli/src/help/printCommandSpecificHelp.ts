import type { Command } from "../types";
import { formatOptionLine } from "./formatOptionLine";
import { formatCommandLine } from "./formatCommandLine";

function printCommandHelp(cmd: Command, cliName: string): void {
  console.log(`\nCommand: ${cmd.name}\n`);
  console.log(`  ${cmd.description}\n`);

  if (cmd.usage) {
    console.log(`Usage: ${cliName} ${cmd.usage}\n`);
  } else {
    console.log(`Usage: ${cliName} ${cmd.name} [options]\n`);
  }

  if (cmd.options && cmd.options.length > 0) {
    console.log("Options:");
    for (const opt of cmd.options) {
      console.log(formatOptionLine(opt));
    }
    console.log("");
  }

  if (cmd.examples && cmd.examples.length > 0) {
    console.log("Examples:");
    for (const example of cmd.examples) {
      console.log(`  ${example}`);
    }
    console.log("");
  }

  if (cmd.subcommands && cmd.subcommands.length > 0) {
    console.log("Subcommands:");
    for (const sub of cmd.subcommands) {
      console.log(formatCommandLine(sub));
    }
    console.log("");
  }
}

export function printCommandSpecificHelp(
  config: { name: string },
  command: Command
): void {
  printCommandHelp(command, config.name);
}
