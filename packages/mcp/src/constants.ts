/**
 * Server identity, protocol defaults, and shared user-facing strings.
 */
import { readFileSync } from "node:fs";

export const SERVER_NAME = "damat-mcp";

/**
 * Read a version string from a package.json at `url`, falling back to "0.0.0"
 * when the file is missing or unreadable. Exported so the fallback is testable
 * without depending on the on-disk package.json.
 */
export function readServerVersion(url: URL): string {
  try {
    const pkg = JSON.parse(readFileSync(url, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Read from this package's package.json at load time so the reported version
 * never drifts from the published release.
 */
export const SERVER_VERSION: string = readServerVersion(
  new URL("../package.json", import.meta.url),
);

export const DEFAULT_PROTOCOL = "2025-06-18";

/** Returned by every registry tool when DAMAT_MODULE_REGISTRY is unset. */
export const NO_REGISTRY_MSG =
  "No registry configured. Set DAMAT_MODULE_REGISTRY to an index URL, a " +
  "registry.json path, or a directory containing one. You can still install " +
  "modules from a git URL or local path with add_module.";

/** Sent on `initialize`; tells the client how to chain the tools. */
export const SERVER_INSTRUCTIONS =
  "Use list_modules/search_modules to discover modules, module_info " +
  "to inspect one, then add_module to install it into the app. " +
  "list_installed shows what is already present.";
