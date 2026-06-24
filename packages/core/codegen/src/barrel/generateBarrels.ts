import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getLogger, type ILogger } from "@damatjs/logger";

export interface GenerateBarrelsResult {
  /** Every `index.ts` barrel written this run. */
  written: string[];
}

const BARREL_NOTE =
  `// AUTO-GENERATED barrel — re-exports every child folder and sibling file.\n` +
  `// Rebuilt by \`damat barrel\`, codegen, and \`damat module add\`. Do not edit.\n`;

/**
 * Recursively (re)write an `index.ts` barrel into `rootDir` and every descendant
 * directory. Each barrel does `export * from "./<child>"` for every child
 * sub-folder and every sibling `.ts`/`.tsx` file (excluding the barrel itself),
 * so the top-level barrel transitively re-exports everything beneath it — a
 * single `@workflows/index` import then reaches any workflow in the tree.
 *
 * Barrels are mechanical and always overwritten so they reflect what is on disk
 * (a hand-added file shows up on the next run). A folder with no exportable
 * children still gets an empty barrel (`export {};`) so its parent can re-export
 * it uniformly. The walk is depth-first — child barrels exist before a parent
 * re-exports them.
 *
 * NOTE: this is intentionally generic. The router discovers routes by file path,
 * so `src/api/routes` is never barreled — only the workflow tree is.
 */
export function generateBarrels(
  rootDir: string,
  loggerData?: ILogger,
): GenerateBarrelsResult {
  const logger = loggerData ?? getLogger();
  const written: string[] = [];
  if (!existsSync(rootDir) || !statSync(rootDir).isDirectory()) {
    return { written };
  }
  walk(rootDir, written);
  logger.info("generateBarrels completed", { rootDir, written: written.length });
  return { written };
}

function walk(dir: string, written: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  const childDirs: string[] = [];
  const childFiles: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) childDirs.push(entry.name);
    else if (entry.name !== "index.ts" && /\.tsx?$/.test(entry.name)) {
      childFiles.push(entry.name);
    }
  }

  // Depth-first: a child folder's barrel must exist before we re-export it.
  for (const child of childDirs) walk(join(dir, child), written);

  const lines: string[] = [];
  for (const child of [...childDirs].sort()) {
    lines.push(`export * from "./${child}";`);
  }
  for (const file of [...childFiles].sort()) {
    lines.push(`export * from "./${file.replace(/\.tsx?$/, "")}";`);
  }

  const body = lines.length > 0 ? `${lines.join("\n")}\n` : "export {};\n";
  const indexPath = join(dir, "index.ts");
  writeFileSync(indexPath, BARREL_NOTE + body, "utf-8");
  written.push(indexPath);
}
