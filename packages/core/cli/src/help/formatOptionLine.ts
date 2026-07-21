import type { CommandOption } from "../types";

export function formatOptionLine(opt: CommandOption): string {
  const flag = opt.alias ? `-${opt.alias}, --${opt.name}` : `--${opt.name}`;

  let line = `  ${flag.padEnd(20)}${opt.description}`;

  if (opt.default !== undefined) {
    line += ` (default: ${JSON.stringify(opt.default)})`;
  }

  if (opt.required) {
    line += " [required]";
  }

  return line;
}
