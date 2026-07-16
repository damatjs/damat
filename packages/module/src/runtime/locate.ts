import { join } from "node:path";
import { existsSync } from "node:fs";
import { MODULE_MANIFEST_FILENAME } from "../manifest/constants";
import { DAMAT_MANIFEST_FILENAME } from "@damatjs/installer";

function hasManifest(path: string, filename: string): boolean {
  return existsSync(join(path, filename));
}

/**
 * Locate the directory holding damat.json or the legacy module manifest inside a
 * module package. Package layout keeps it in src/; the legacy in-app
 * layout keeps it at the root.
 */
export function locateModuleDir(packageDir: string): string {
  const srcDir = join(packageDir, "src");
  if (hasManifest(packageDir, DAMAT_MANIFEST_FILENAME)) return packageDir;
  if (hasManifest(srcDir, DAMAT_MANIFEST_FILENAME)) return srcDir;
  if (hasManifest(srcDir, MODULE_MANIFEST_FILENAME)) return srcDir;
  if (hasManifest(packageDir, MODULE_MANIFEST_FILENAME)) return packageDir;
  throw new Error(
    `No damat.json or ${MODULE_MANIFEST_FILENAME} found in ${packageDir} or ${srcDir} — not a damat module package`,
  );
}
