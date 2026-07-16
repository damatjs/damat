import type { ResolvedArtifact } from "../origin";
import { hashRecipe, selectInstallMode } from "../recipe";
import type { InstallerLock } from "../types/lockfile";
import type { InstallerPlan } from "../types/plan";
import type { InstallMode, InstallRecipe } from "../types/recipe";
import type { VerificationPolicy } from "../types/security";
import type { PackageBackend } from "../types/manifest";
import { selectPackageBackend } from "../package-backend";
import { createDamatPackageOperations } from "./damat-package";
import { createFileOperations } from "./files";
import { createPackageOperations } from "./packages";
import { evaluatePlanSecurity } from "./security";

export interface CreateInstallPlanInput {
  projectDir: string;
  artifact: ResolvedArtifact;
  recipe: InstallRecipe;
  mode?: InstallMode;
  packageBackend?: PackageBackend;
  supportedPackageBackends?: PackageBackend[];
  experimentalPackage?: boolean;
  lock: InstallerLock;
  securityPolicy?: VerificationPolicy;
}

export function createInstallPlan(
  input: CreateInstallPlanInput,
): InstallerPlan {
  const supportedModes = input.packageBackend === "damat"
    ? [...new Set([...input.artifact.supportedModes, "package" as const])]
    : input.artifact.supportedModes;
  const mode = selectInstallMode(
    input.mode,
    input.recipe,
    supportedModes,
  );
  const security = evaluatePlanSecurity(
    input.artifact,
    input.recipe,
    mode,
    input.securityPolicy ?? "warn",
  );
  const packageBackend = selectPackageBackend({
    mode,
    ...(input.packageBackend && { requested: input.packageBackend }),
    ...(input.supportedPackageBackends && {
      supported: input.supportedPackageBackends,
    }),
    ...(input.experimentalPackage !== undefined && {
      experimentalPackage: input.experimentalPackage,
    }),
  });
  void input.lock;
  return {
    schemaVersion: 1,
    action: "add",
    projectDir: input.projectDir,
    installationId: input.recipe.id,
    kind: input.recipe.kind,
    ...(input.recipe.version && { version: input.recipe.version }),
    mode,
    ...(packageBackend && { packageBackend }),
    provenance: input.artifact.provenance,
    artifactIntegrity: input.artifact.integrity,
    recipeIntegrity: hashRecipe(input.recipe),
    verification: security.verification,
    usageHints: input.recipe.usageHints ?? [],
    operations:
      mode === "source"
        ? createFileOperations(input.artifact, input.recipe)
        : packageBackend === "damat"
          ? createDamatPackageOperations(input.artifact, input.recipe)
          : createPackageOperations(input.artifact, input.recipe),
    warnings: security.warnings,
  };
}
