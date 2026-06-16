import { cpSync } from "node:fs";

/** Copy a module directory into the app, excluding VCS/dependency dirs */
export function copyModule(sourceDir: string, targetDir: string): void {
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (src) =>
      !src.includes("/.git/") &&
      !src.endsWith("/.git") &&
      !src.includes("/node_modules/") &&
      !src.endsWith("/node_modules"),
  });
}
