import { join } from "node:path";
import type { PackageManagerAdapter, PackageManagerName } from "./types";

export interface AdapterConfig {
  name: PackageManagerName;
  command: string;
  add: string;
  remove: string;
  lockfile: string;
}

export function makeAdapter(
  config: AdapterConfig,
  projectDir: string,
): PackageManagerAdapter {
  const scriptFlag = "--ignore-scripts";
  return {
    name: config.name,
    touchedFiles(root) {
      return [join(root, "package.json"), join(root, config.lockfile)];
    },
    addCommand(packages, allowScripts) {
      const specs = Object.entries(packages)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, reference]) => `${name}@${reference}`);
      return {
        command: config.command,
        args: [config.add, ...(!allowScripts ? [scriptFlag] : []), ...specs],
        cwd: projectDir,
      };
    },
    removeCommand(names, allowScripts) {
      return {
        command: config.command,
        args: [
          config.remove,
          ...(!allowScripts ? [scriptFlag] : []),
          ...[...names].sort(),
        ],
        cwd: projectDir,
      };
    },
  };
}
