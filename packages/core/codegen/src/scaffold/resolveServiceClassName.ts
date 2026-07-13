import { join } from "node:path";
import { readFileSync } from "node:fs";
import { toPascalCase } from "./naming";

/**
 * Resolve a module's service class name by reading `service.ts`
 * (`export class <X> extends ModuleService(...)`). Falls back to the scaffold
 * convention `${PascalCase(moduleId)}Service` when the file can't be read.
 */
export function resolveServiceClassName(
  moduleDir: string,
  moduleId: string,
): string {
  try {
    const src = readFileSync(join(moduleDir, "service.ts"), "utf-8");
    const m = src.match(/export\s+class\s+(\w+)\s+extends\s+ModuleService/);
    if (m?.[1]) return m[1];
  } catch {
    /* fall through to the convention */
  }
  return `${toPascalCase(moduleId)}Service`;
}
