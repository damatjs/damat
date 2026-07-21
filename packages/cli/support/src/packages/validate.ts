import type { PackageValidationOptions } from "./types";

const NAME = /^(@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/;
const RANGE = /^[a-zA-Z0-9.*^~<>=|+-]*$/;
const UNSAFE_RANGE = /^[\w.*^~<>=|+:/@#-]*$/;

export function invalidPackageSpecs(
  packages: Record<string, string>,
  options: PackageValidationOptions = {},
): string[] {
  const invalid: string[] = [];
  for (const [name, range] of Object.entries(packages)) {
    if (name.startsWith("-") || name.length > 214 || !NAME.test(name)) {
      invalid.push(`"${name}" is not a valid npm package name`);
      continue;
    }
    const pattern = options.allowUnsafeRanges ? UNSAFE_RANGE : RANGE;
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
