import type { ResolvedArtifact } from "../origin";
import type { InstallerLock } from "../types/lockfile";
import type { InstallMode, InstallRecipe } from "../types/recipe";
import { createInstallPlan } from "./create";

export interface AddInput {
  projectDir: string;
  artifact: ResolvedArtifact;
  recipe: InstallRecipe;
  lock: InstallerLock;
  mode?: InstallMode;
}

export async function createAddPlan(input: AddInput) {
  return createInstallPlan(input);
}
