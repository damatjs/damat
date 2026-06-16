/**
 * Configuration derived from environment variables. See the env-var reference
 * in bin/damat-mcp.ts for what each one controls.
 */

/** Working directory of the target Damat app (installs + scans run here). */
export function appDir(): string {
  return process.env.DAMAT_APP_DIR || process.cwd();
}

/** Registry index location, or undefined to run in registry-less mode. */
export function registryLocation(): string | undefined {
  return process.env.DAMAT_MODULE_REGISTRY;
}

/** The damat CLI command split into argv (DAMAT_CLI may contain arguments). */
export function damatCli(): string[] {
  const raw = process.env.DAMAT_CLI || "damat";
  return raw.split(" ").filter(Boolean);
}
