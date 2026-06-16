import { spawnSync } from "node:child_process";
import type { PackageInstallResult } from "./types";

/** Install npm packages the module requires, via bun add */
export function installModulePackages(
  appDir: string,
  packages: Record<string, string>,
): PackageInstallResult {
  const specs = Object.entries(packages).map(([pkgName, range]) =>
    range && range !== "*" ? `${pkgName}@${range}` : pkgName,
  );
  if (specs.length === 0) return { ok: true, output: "" };

  const result = spawnSync("bun", ["add", ...specs], {
    cwd: appDir,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return {
    ok: result.status === 0,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}
