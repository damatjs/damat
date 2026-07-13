import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';


/** Rewrite package.json's name; false when the file is missing/unparseable. */
export function renamePackage(targetDir: string, name: string): boolean {
  const packageJsonPath = join(targetDir, "package.json");
  if (!existsSync(packageJsonPath)) return false;
  try {
    const raw = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    pkg.name = name;
    const indent = raw.match(/^(\s+)"/m)?.[1] ?? "  ";
    writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, indent)}\n`);
    return true;
  } catch {
    return false;
  }
}
