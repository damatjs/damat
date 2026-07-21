import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["packages", "backend", "apps", "scripts"];
const failures: string[] = [];
const releaseHistory = new Set([
  "apps/web/src/modules/releases/templates/index.tsx",
]);

function allowed(file: string): boolean {
  return (
    file === "scripts/check-codegen-boundaries.ts" || releaseHistory.has(file)
  );
}

function visit(path: string): void {
  for (const name of readdirSync(path)) {
    if (name === "dist" || name === "node_modules" || name === ".turbo")
      continue;
    const file = join(path, name);
    if (statSync(file).isDirectory()) visit(file);
    else if (/\.(ts|tsx|json)$/.test(file)) {
      const text = readFileSync(file, "utf8");
      if (text.includes("@damatjs/codegen") && !allowed(file))
        failures.push(file);
    }
  }
}

roots.forEach(visit);
if (failures.length)
  throw new Error(`Legacy codegen imports:\n${failures.join("\n")}`);
