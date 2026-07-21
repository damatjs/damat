import { cpSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const notVcsOrDeps = (source: string): boolean =>
  !source.includes("/.git/") &&
  !source.endsWith("/.git") &&
  !source.includes("/node_modules/") &&
  !source.endsWith("/node_modules");

export function copyModule(sourceDir: string, targetDir: string): void {
  cpSync(sourceDir, targetDir, { recursive: true, filter: notVcsOrDeps });
}

export function mergeChildren(source: string, target: string): void {
  for (const entry of readdirSync(source)) {
    cpSync(join(source, entry), join(target, entry), {
      recursive: true,
      filter: notVcsOrDeps,
    });
  }
}
