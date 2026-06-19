/**
 * Server identity, protocol defaults, and shared user-facing strings.
 */

export const SERVER_NAME = "damat-mcp";
export const SERVER_VERSION = "0.1.3";
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
