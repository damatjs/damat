import { join } from "node:path";
import { existsSync } from "node:fs";
import { MODULE_MANIFEST_FILENAME } from "../manifest/constants";

/**
 * Locate the module directory (the one holding module.json) inside a
 * module package. Package layout keeps it in src/; the legacy in-app
 * layout keeps it at the root.
 */
export function locateModuleDir(packageDir: string): string {
  const srcDir = join(packageDir, "src");
  if (existsSync(join(srcDir, MODULE_MANIFEST_FILENAME))) {
    return srcDir;
  }
  if (existsSync(join(packageDir, MODULE_MANIFEST_FILENAME))) {
    return packageDir;
  }
  throw new Error(
    `No ${MODULE_MANIFEST_FILENAME} found in ${packageDir} or ${srcDir} — not a damat module package`,
  );
}
