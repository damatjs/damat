import { isAbsolute, normalize, sep } from "node:path";
import { verificationPolicy, type VerificationPolicy } from "@damatjs/module";

// Same rule the module.json manifest enforces (MODULE_NAME_PATTERN in
// @damatjs/module): ids are a single kebab-case segment. Anything else —
// separators, "..", drive letters — could escape <app>/<modulesDir>/<id>.
const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Why a module id is unsafe to use in filesystem paths (null = safe). */
export function moduleIdError(id: string): string | null {
  if (MODULE_ID_PATTERN.test(id)) return null;
  return (
    `Module id "${id}" must be kebab-case (lowercase letters, digits, dashes)` +
    ` — path separators and ".." are not allowed`
  );
}

/** Why a --dir value is unsafe as the modules directory (null = safe). */
export function modulesDirError(dir: string): string | null {
  if (!dir || isAbsolute(dir)) {
    return `--dir must be a relative path inside the app (got "${dir}")`;
  }
  const segments = normalize(dir).split(sep);
  if (segments.includes("..")) {
    return `--dir must stay inside the app — ".." segments are not allowed (got "${dir}")`;
  }
  return null;
}

/**
 * Why a non-registry source may not be installed (null = allowed).
 *
 * Registry installs carry a verification stamp that evaluateVerification
 * gates; path/git sources carry none, so they need the explicit
 * --allow-unverified opt-in. DAMAT_MODULE_VERIFY=off (the existing
 * "install anything, say nothing" policy) is honoured as the same opt-in.
 */
export function unverifiedSourceError(
  originType: string,
  allowUnverified: boolean,
  policy: VerificationPolicy = verificationPolicy(),
): string | null {
  if (allowUnverified || policy === "off") return null;
  return (
    `${originType} sources are not verified by a registry — re-run with ` +
    `--allow-unverified to accept this module's code and dependencies as-is ` +
    `(or set DAMAT_MODULE_VERIFY=off)`
  );
}
