/**
 * The install-time verification gate.
 *
 * The hosted registry backend that actually performs owner-identity and source
 * verification is not live yet. This module is the local gate that the CLI runs
 * on `damat module add <name>`: it reads the verification a registry index
 * carries and applies a policy. When the backend ships, it becomes the thing
 * that stamps `RegistryVerification` on entries — this gate stays the same.
 *
 * Policy (DAMAT_MODULE_VERIFY, or the boolean DAMAT_MODULE_REQUIRE_VERIFIED):
 *   off      — install anything, say nothing
 *   warn     — install anything, but warn when not verified (default)
 *   require  — only install verified modules
 *
 * Regardless of policy, a `rejected` or `revoked` module is always blocked.
 */
import type { RegistryVerification, VerificationStatus } from "./entry";

export type VerificationPolicy = "off" | "warn" | "require";

export interface VerificationDecision {
  /** Whether the install may proceed */
  allowed: boolean;
  /** The status that was evaluated */
  status: VerificationStatus;
  /** Human-readable note for the CLI to print (the reason to warn or block) */
  message?: string;
}

/** Resolve the active verification policy from the environment. */
export function verificationPolicy(
  env: Record<string, string | undefined> = process.env,
): VerificationPolicy {
  const explicit = env.DAMAT_MODULE_VERIFY?.toLowerCase();
  if (explicit === "off" || explicit === "warn" || explicit === "require") {
    return explicit;
  }
  if (isTrue(env.DAMAT_MODULE_REQUIRE_VERIFIED)) return "require";
  return "warn";
}

/**
 * Evaluate a module's verification against the policy. Pure and offline: it
 * trusts the status the registry index carries (the backend is what produces
 * that status). `undefined` verification is treated as "unverified".
 */
export function evaluateVerification(
  verification: RegistryVerification | undefined,
  policy: VerificationPolicy = verificationPolicy(),
): VerificationDecision {
  const status = verification?.status ?? "unverified";

  if (status === "rejected" || status === "revoked") {
    return {
      allowed: false,
      status,
      message:
        `module is ${status} in the registry` +
        (verification?.reason ? `: ${verification.reason}` : "") +
        " — installing it is blocked",
    };
  }

  if (status === "verified") {
    return { allowed: true, status };
  }

  // unverified / pending
  if (policy === "off") return { allowed: true, status };
  if (policy === "require") {
    return {
      allowed: false,
      status,
      message:
        `module is ${status} and policy is "require" — set DAMAT_MODULE_VERIFY=warn ` +
        "to install it anyway, or add it from a path/git source",
    };
  }
  return {
    allowed: true,
    status,
    message: `module is ${status} — its owner/source has not been verified by the registry`,
  };
}

function isTrue(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}
