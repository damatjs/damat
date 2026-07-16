import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import type { ResolvedArtifact } from "../origin";
import type { InstallerOperation, InstallRecipe } from "../types";
import { createFileOperations } from "./files";

function hasRuntimeDependencies(root: string): boolean {
  const path = join(root, "package.json");
  if (!existsSync(path)) return false;
  const value = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  return ["dependencies", "peerDependencies", "optionalDependencies"].some(
    (key) =>
      Object.keys((value[key] as Record<string, unknown>) ?? {}).length > 0,
  );
}

export function createDamatPackageOperations(
  artifact: ResolvedArtifact,
  recipe: InstallRecipe,
): InstallerOperation[] {
  if (
    Object.keys(recipe.packages ?? {}).length ||
    hasRuntimeDependencies(artifact.rootDir)
  )
    throw new Error("Damat package alpha requires a self-contained artifact");
  const target = posix.join(".damat/packages", recipe.id);
  const { packages: _packages, ...selfContained } = recipe;
  return createFileOperations(artifact, {
    ...selfContained,
    mappings: [{ from: "**", to: target }],
    ignore: [".git/**", ...(recipe.ignore ?? [])],
  });
}
