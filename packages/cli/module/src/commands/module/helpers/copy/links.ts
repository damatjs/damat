import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  listModelBasenames,
  listOwnerDirs,
  renderAggregator,
  renderOwnerIndex,
} from "../linkTemplates";
import { notVcsOrDeps } from "./common";
import type { LinkModelFile } from "./types";

export function collectLinkModelFiles(root: string): LinkModelFile[] {
  if (!existsSync(root)) return [];
  const files = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (!notVcsOrDeps(path)) continue;
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith(".ts") && entry !== "index.ts")
        files.set(entry.slice(0, -3), path);
    }
  };
  walk(root);
  return [...files.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([base, path]) => ({ base, path }));
}

export function installModuleLinks(
  models: LinkModelFile[],
  linksTarget: string,
  linksRoot: string,
  force: boolean,
): void {
  const target = join(linksTarget, "models");
  mkdirSync(target, { recursive: true });
  for (const { base, path } of models) {
    const destination = join(target, `${base}.ts`);
    if (!existsSync(destination) || force) cpSync(path, destination);
  }
  mkdirSync(join(linksTarget, "migrations"), { recursive: true });
  writeFileSync(
    join(linksTarget, "index.ts"),
    renderOwnerIndex(listModelBasenames(target)),
  );
  writeFileSync(
    join(linksRoot, "index.ts"),
    renderAggregator(listOwnerDirs(linksRoot)),
  );
}
