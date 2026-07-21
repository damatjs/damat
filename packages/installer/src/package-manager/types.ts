import type { CommandSpec } from "../types/runtime";

export type PackageManagerName = "bun" | "npm" | "pnpm" | "yarn";

export interface PackageManagerAdapter {
  name: PackageManagerName;
  touchedFiles(projectDir: string): string[];
  addCommand(
    packages: Record<string, string>,
    allowScripts: boolean,
  ): CommandSpec;
  removeCommand(names: string[], allowScripts: boolean): CommandSpec;
}
