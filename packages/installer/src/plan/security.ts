import type { ResolvedArtifact } from "../origin";
import { assertSecurityAllowed, evaluateSecurity } from "../security";
import type { InstallMode, InstallRecipe } from "../types/recipe";
import type { VerificationPolicy, VerificationStatus } from "../types/security";

function verification(artifact: ResolvedArtifact): VerificationStatus {
  const value = artifact.metadata.verification;
  if (
    value === "verified" ||
    value === "unverified" ||
    value === "rejected" ||
    value === "revoked"
  )
    return value;
  return "unverified";
}

export function evaluatePlanSecurity(
  artifact: ResolvedArtifact,
  recipe: InstallRecipe,
  mode: InstallMode,
  policy: VerificationPolicy,
) {
  const report = evaluateSecurity({
    origin: artifact.request,
    immutableIdentity: artifact.immutableIdentity,
    ...(artifact.expectedIntegrity && {
      expectedIntegrity: artifact.expectedIntegrity,
    }),
    computedIntegrity: artifact.integrity,
    verification: verification(artifact),
    verificationSource:
      artifact.request.type === "registry" ? "registry" : "direct",
    mode,
    policy,
    recipe,
  });
  assertSecurityAllowed(report);
  return report;
}
