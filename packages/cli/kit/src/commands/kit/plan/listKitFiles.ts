import { lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { KIT_MANIFEST_FILENAME } from "../manifest";
import { globToRegExp } from "./glob";

export function listKitFiles(kitDir: string, ignore: string[]): string[] {
  const ignored = ignore.map(globToRegExp);
  const files: string[] = [];
  const walk = (directory: string, relative: string): void => {
    for (const entry of readdirSync(directory)) {
      if (entry === ".git" || entry === "node_modules") continue;
      const absolute = join(directory, entry);
      const path = relative ? `${relative}/${entry}` : entry;
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        walk(absolute, path);
      } else if (path !== KIT_MANIFEST_FILENAME && !ignored.some((item) => item.test(path))) {
        files.push(path);
      }
    }
  };
  walk(kitDir, "");
  return files.sort();
}
