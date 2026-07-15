import type {
  SecurityFinding,
  SecurityInput,
  SecurityReport,
} from "../types/security";
import { containsExecutableRecipeValue } from "./recipe";

const finding = (
  code: string,
  message: string,
  severity: SecurityFinding["severity"],
): SecurityFinding => ({ code, message, severity });

export function evaluateSecurity(input: SecurityInput): SecurityReport {
  const findings: SecurityFinding[] = [];
  if (
    input.expectedIntegrity &&
    input.expectedIntegrity !== input.computedIntegrity
  ) {
    findings.push(
      finding(
        "integrity-mismatch",
        "Expected and computed integrity do not match.",
        "error",
      ),
    );
  }
  if (input.verification === "rejected" || input.verification === "revoked") {
    findings.push(
      finding(
        "registry-status",
        `Registry verification is ${input.verification}.`,
        "error",
      ),
    );
  } else if (input.verification === "unverified" && input.policy !== "off") {
    const severity = input.policy === "require" ? "error" : "warning";
    findings.push(
      finding("unverified-origin", "Origin is unverified.", severity),
    );
  }
  if (
    input.recipe !== undefined &&
    containsExecutableRecipeValue(input.recipe)
  ) {
    findings.push(
      finding(
        "executable-recipe-field",
        "Recipe contains executable fields or values.",
        "error",
      ),
    );
  }
  if (input.archiveFindings?.length)
    findings.push(
      finding("unsafe-archive", input.archiveFindings.join("; "), "error"),
    );
  if (input.packageScripts?.length && !input.allowScripts) {
    findings.push(
      finding(
        "package-scripts",
        `Package scripts require explicit approval: ${input.packageScripts.join(", ")}.`,
        "error",
      ),
    );
  }
  const warnings = findings
    .filter(({ severity }) => severity === "warning")
    .map(({ message }) => message);
  return {
    allowed: !findings.some(({ severity }) => severity === "error"),
    findings,
    warnings,
    origin: input.origin,
    immutableIdentity: input.immutableIdentity,
    ...(input.expectedIntegrity && {
      expectedIntegrity: input.expectedIntegrity,
    }),
    computedIntegrity: input.computedIntegrity,
    verificationSource: input.verificationSource,
    mode: input.mode,
    verification: input.verification,
  };
}
