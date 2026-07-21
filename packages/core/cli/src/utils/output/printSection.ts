import type { CliOutput } from "../../types";

export function printSection(
  output: CliOutput,
  title: string,
  content: string[],
): void {
  output.write(`\n${title}:`);
  for (const line of content) {
    output.write(`  ${line}`);
  }
}
