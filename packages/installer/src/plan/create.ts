import type { ResolvedArtifact } from "../origin";
import { hashRecipe, selectInstallMode } from "../recipe";
import type { InstallerLock } from "../types/lockfile";
import type { InstallerPlan } from "../types/plan";
import type { InstallMode, InstallRecipe } from "../types/recipe";
import type { VerificationPolicy } from "../types/security";
import { createFileOperations } from "./files";
import { createPackageOperations } from "./packages";
import { evaluatePlanSecurity } from "./security";

export interface CreateInstallPlanInput {
  projectDir: string;
  artifact: ResolvedArtifact;
  recipe: InstallRecipe;
  mode?: InstallMode;
  lock: InstallerLock;
  securityPolicy?: VerificationPolicy;
}

export function createInstallPlan(
  input: CreateInstallPlanInput,
): InstallerPlan {
  const mode = selectInstallMode(
    input.mode,
    input.recipe,
    input.artifact.supportedModes,
  );
  const security = evaluatePlanSecurity(
    input.artifact,
    input.recipe,
    mode,
    input.securityPolicy ?? "warn",
  );
  void input.lock;
  return {
    schemaVersion: 1,
    action: "add",
    projectDir: input.projectDir,
    installationId: input.recipe.id,
    kind: input.recipe.kind,
    ...(input.recipe.version && { version: input.recipe.version }),
    mode,
    provenance: input.artifact.provenance,
    artifactIntegrity: input.artifact.integrity,
    recipeIntegrity: hashRecipe(input.recipe),
    verification: security.verification,
    usageHints: input.recipe.usageHints ?? [],
    operations:
      mode === "source"
        ? createFileOperations(input.artifact, input.recipe)
        : createPackageOperations(input.artifact, input.recipe),
    warnings: security.warnings,
  };
}
