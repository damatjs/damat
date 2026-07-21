/** Trust state stamped by the registry backend. */
export type VerificationStatus =
  "unverified" | "pending" | "verified" | "rejected" | "revoked";

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "revoked",
];

/** Author identity mirrored from the module manifest. */
export interface RegistryAuthor {
  name: string;
  email?: string;
  url?: string;
}

/** Registry account that published the module. */
export interface RegistryOwner {
  /** Registry namespace, for example `damatjs`. */
  namespace: string;
  /** Stable account or organisation identifier. */
  id?: string;
  /** Public profile or organisation URL. */
  url?: string;
  /** Whether the registry verified this owner's identity. */
  verified?: boolean;
}

/** Verification stamped by the registry backend. */
export interface RegistryVerification {
  status: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  integrity?: string;
  reason?: string;
}

/** A pinned source for one version or tag. */
export interface RegistryVersionEntry {
  source: string;
  integrity?: string;
  verification?: RegistryVerification;
}

/** Normalize a version source into its full form. */
export function normalizeVersionEntry(
  value: RegistryVersionEntry | string,
): RegistryVersionEntry {
  return typeof value === "string" ? { source: value } : value;
}
