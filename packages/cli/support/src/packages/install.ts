import { spawnSync } from "node:child_process";
import type { PackageInstallOptions, PackageInstallResult } from "./types";

export function installPackages(
  cwd: string,
  packages: Record<string, string>,
  options: PackageInstallOptions = {},
): PackageInstallResult {
  const specs = Object.entries(packages).map(([name, range]) =>
    range && range !== "*" ? `${name}@${range}` : name,
  );
  if (specs.length === 0) return { ok: true, output: "" };
  const args = [
    "add",
    ...(options.allowScripts ? [] : ["--ignore-scripts"]),
    ...specs,
  ];
  const result = spawnSync("bun", args, {
    cwd,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return {
    ok: result.status === 0,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}
