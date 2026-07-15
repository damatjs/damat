import { lstatSync, readdirSync } from "node:fs";
import { basename, join, posix, relative } from "node:path";
import { hashFile } from "../integrity";
import { assertSafeRelativePath } from "../schema/path";
import type { InstallMapping, InstallRecipe } from "../types/recipe";
import { matchGlob } from "./glob";

export interface MappedArtifactFile {
  source: string;
  relativeSource: string;
  target: string;
  checksum: string;
}

function collect(root: string): string[] {
  const stat = lstatSync(root);
  if (stat.isSymbolicLink())
    throw new Error(`symbolic link is not installable: ${root}`);
  if (!stat.isDirectory()) return [root];
  return readdirSync(root)
    .sort()
    .flatMap((name) => collect(join(root, name)));
}

function relativePath(root: string, file: string): string {
  return lstatSync(root).isDirectory()
    ? relative(root, file).split("\\").join("/")
    : basename(file);
}

function mappedTarget(path: string, mapping: InstallMapping): string {
  const wildcard = mapping.from.search(/[?*]/);
  if (wildcard < 0) return assertSafeRelativePath(mapping.to, "mapping target");
  const prefix = mapping.from.slice(0, wildcard).replace(/[^/]*$/, "");
  const suffix = path.slice(prefix.length);
  return assertSafeRelativePath(
    posix.join(mapping.to, suffix),
    "mapping target",
  );
}

export function mapArtifactFiles(
  root: string,
  recipe: InstallRecipe,
): MappedArtifactFile[] {
  const mappings = recipe.mappings;
  return collect(root)
    .map((source) => ({ source, relativeSource: relativePath(root, source) }))
    .filter(
      ({ relativeSource }) =>
        !recipe.ignore?.some((pattern) => matchGlob(relativeSource, pattern)),
    )
    .flatMap(({ source, relativeSource }) => {
      const mapping = mappings?.find(({ from }) =>
        matchGlob(relativeSource, from),
      );
      if (mappings && !mapping) return [];
      const target = mapping
        ? mappedTarget(relativeSource, mapping)
        : relativeSource;
      return [{ source, relativeSource, target, checksum: hashFile(source) }];
    })
    .sort((left, right) => left.target.localeCompare(right.target));
}
