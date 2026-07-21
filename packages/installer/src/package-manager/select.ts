import { bunAdapter } from "./bun";
import { npmAdapter } from "./npm";
import { pnpmAdapter } from "./pnpm";
import type { PackageManagerAdapter, PackageManagerName } from "./types";
import { yarnAdapter } from "./yarn";

export function createPackageManagerAdapter(
  name: PackageManagerName,
  projectDir: string,
): PackageManagerAdapter {
  if (name === "bun") return bunAdapter(projectDir);
  if (name === "npm") return npmAdapter(projectDir);
  if (name === "pnpm") return pnpmAdapter(projectDir);
  return yarnAdapter(projectDir);
}
