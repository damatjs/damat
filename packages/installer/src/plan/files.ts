import type { InstallerOperation } from "../types/plan";
import { mapArtifactFiles } from "../recipe";
import type { ResolvedArtifact } from "../origin";
import type { InstallRecipe } from "../types/recipe";

export function createFileOperations(
  artifact: ResolvedArtifact,
  recipe: InstallRecipe,
): InstallerOperation[] {
  return mapArtifactFiles(artifact.rootDir, recipe).map(
    ({ source, target, checksum }) => ({
      type: "write-file",
      source,
      target,
      checksum,
    }),
  );
}
