import { spawnSync } from "node:child_process";
import type { PackageInstallResult } from "./types";

// npm package name grammar: optionally scoped, lowercase URL-safe, ≤ 214 chars.
// Also blocks flag injection — a name can never start with "-".
const PACKAGE_NAME_PATTERN =
  /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/;
// Plausible semver range or dist-tag. No whitespace, ":" or "/" — rejects
// file:/git+/http sources and github shorthands.
const RANGE_PATTERN = /^[a-zA-Z0-9.*^~<>=|+-]*$/;
// With unsafe ranges explicitly allowed, protocols/paths may appear but
// whitespace and shell metacharacters still may not.
const UNSAFE_RANGE_PATTERN = /^[\w.*^~<>=|+:/@#-]*$/;

/**
 * Package specs that must not reach `bun add` — one message per offending
 * entry; empty means everything is installable. `allowUnsafeRanges` permits
 * file:/git+/url ranges (an explicit opt-in via --allow-unverified).
 */
export function invalidPackageSpecs(
  packages: Record<string, string>,
  options: { allowUnsafeRanges?: boolean } = {},
): string[] {
  const invalid: string[] = [];
  for (const [name, range] of Object.entries(packages)) {
    if (name.length > 214 || !PACKAGE_NAME_PATTERN.test(name)) {
      invalid.push(`"${name}" is not a valid npm package name`);
      continue;
    }
    const pattern = options.allowUnsafeRanges
      ? UNSAFE_RANGE_PATTERN
      : RANGE_PATTERN;
    if (!pattern.test(range)) {
      invalid.push(
        `"${name}@${range}" — range must be a semver range or dist-tag` +
          (options.allowUnsafeRanges
            ? ""
            : " (file:/git/url sources need --allow-unverified)"),
      );
    }
  }
  return invalid;
}

/** Install npm packages the module requires, via bun add */
export function installModulePackages(
  appDir: string,
  packages: Record<string, string>,
  options: { allowScripts?: boolean } = {},
): PackageInstallResult {
  const specs = Object.entries(packages).map(([pkgName, range]) =>
    range && range !== "*" ? `${pkgName}@${range}` : pkgName,
  );
  if (specs.length === 0) return { ok: true, output: "" };

  // Lifecycle scripts are an arbitrary-code hook; keep them off unless the
  // user opted in with --allow-scripts.
  const args = [
    "add",
    ...(options.allowScripts ? [] : ["--ignore-scripts"]),
    ...specs,
  ];
  const result = spawnSync("bun", args, {
    cwd: appDir,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return {
    ok: result.status === 0,
    output: (result.stdout ?? "") + (result.stderr ?? ""),
  };
}
