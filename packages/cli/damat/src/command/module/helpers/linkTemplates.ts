import { join } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";

/** Kebab/snake → camelCase, for import identifiers ("user-organization" → "userOrganization"). */
export function camelize(name: string): string {
  return name.replace(/[-_]([a-z0-9])/gi, (_, c: string) => c.toUpperCase());
}

/** The `index.ts` for one owner directory, listing every model file. */
export function renderOwnerIndex(modelBasenames: string[]): string {
  const imports = modelBasenames
    .map((b) => `import ${camelize(b)} from "./models/${b}";`)
    .join("\n");
  const ids = modelBasenames.map((b) => camelize(b)).join(", ");
  return `import { collectLinkModels } from "@damatjs/framework";
${imports}

export const links = [${ids}];
export const models = collectLinkModels(links);
`;
}

/** The top-level `src/links/index.ts` aggregating every owner's links. */
export function renderAggregator(ownerDirs: string[]): string {
  const imports = ownerDirs
    .map((o) => `import { links as ${camelize(o)}Links } from "./${o}";`)
    .join("\n");
  const spreads = ownerDirs.map((o) => `...${camelize(o)}Links`).join(", ");
  return `import { defineLinkModule } from "@damatjs/framework";
${imports}

export const links = [${spreads}];

export default defineLinkModule(links);
`;
}

/** The link model basenames (no extension) under an owner's `models/` dir, sorted. */
export function listModelBasenames(modelsDir: string): string[] {
  if (!existsSync(modelsDir)) return [];
  return readdirSync(modelsDir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.slice(0, -3))
    .sort();
}

/** The owner directories under `src/links` (those with an `index.ts`), sorted. */
export function listOwnerDirs(linksDir: string): string[] {
  if (!existsSync(linksDir)) return [];
  return readdirSync(linksDir)
    .filter((name) => {
      const sub = join(linksDir, name);
      let isDir = false;
      try {
        isDir = statSync(sub).isDirectory();
      } catch {
        return false;
      }
      return isDir && existsSync(join(sub, "index.ts"));
    })
    .sort();
}
