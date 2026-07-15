import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const EXCLUDED = new Set([".git", ".damat", "node_modules", "dist", "build"]);

export function usageFiles(
  projectDir: string,
): Array<{ path: string; content: string }> {
  const output: Array<{ path: string; content: string }> = [];
  function walk(directory: string): void {
    for (const name of readdirSync(directory).sort()) {
      if (EXCLUDED.has(name)) continue;
      const absolute = join(directory, name);
      const stat = lstatSync(absolute);
      if (stat.isDirectory()) walk(absolute);
      else if (stat.isFile()) {
        const bytes = readFileSync(absolute);
        if (!bytes.includes(0))
          output.push({
            path: relative(projectDir, absolute).split("\\").join("/"),
            content: bytes.toString("utf8"),
          });
      }
    }
  }
  walk(projectDir);
  return output;
}
