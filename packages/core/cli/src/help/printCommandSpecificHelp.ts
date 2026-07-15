import type { CliOutput, Command } from "../types";
import { formatOptionLine } from "./formatOptionLine";
import { formatCommandLine } from "./formatCommandLine";

function printCommandHelp(
  cmd: Command,
  cliName: string,
  output: CliOutput,
): void {
  output.write(`\nCommand: ${cmd.name}\n`);
  output.write(`  ${cmd.description}\n`);

  if (cmd.usage) {
    output.write(`Usage: ${cliName} ${cmd.usage}\n`);
  } else {
    output.write(`Usage: ${cliName} ${cmd.name} [options]\n`);
  }

  if (cmd.options && cmd.options.length > 0) {
    output.write("Options:");
    for (const opt of cmd.options) {
      output.write(formatOptionLine(opt));
    }
    output.write();
  }

  if (cmd.examples && cmd.examples.length > 0) {
    output.write("Examples:");
    for (const example of cmd.examples) {
      output.write(`  ${example}`);
    }
    output.write();
  }

  if (cmd.subcommands && cmd.subcommands.length > 0) {
    output.write("Subcommands:");
    for (const sub of cmd.subcommands) {
      output.write(formatCommandLine(sub));
    }
    output.write();
  }
}

export function printCommandSpecificHelp(
  definition: { name: string },
  command: Command,
  output: CliOutput,
): void {
  printCommandHelp(command, definition.name, output);
}
