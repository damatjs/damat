import type { InstallationRecord } from "../types/lockfile";
import type { VerificationStatus } from "../types/security";
import {
  assertRecord,
  optionalString,
  rejectUnknownKeys,
  requiredString,
} from "./assert";
import { parseInstallMode } from "./mode";
import type { PackageBackend } from "../types";
import { parseOwnedFiles, parseOwnedPackages } from "./owned";
import { parseProvenance } from "./provenance";
import { parseUsageHints } from "./recipe-parts";

const RECORD_KEYS = [
  "artifactId",
  "kind",
  "version",
  "mode",
  "packageBackend",
  "provenance",
  "artifactIntegrity",
  "recipeIntegrity",
  "verification",
  "installedAt",
  "files",
  "packages",
  "usageHints",
];

function parseVerification(value: unknown): VerificationStatus {
  if (
    value === "verified" ||
    value === "unverified" ||
    value === "rejected" ||
    value === "revoked"
  )
    return value;
  throw new TypeError("verification is invalid");
}

function parsePackageBackend(value: unknown): PackageBackend {
  if (value === "node" || value === "damat") return value;
  throw new TypeError("packageBackend is invalid");
}

export function parseInstallationRecord(value: unknown): InstallationRecord {
  const record = assertRecord(value, "installation");
  rejectUnknownKeys(record, RECORD_KEYS);
  const version = optionalString(record, "version");
  return {
    artifactId: requiredString(record, "artifactId"),
    kind: requiredString(record, "kind"),
    ...(version && { version }),
    mode: parseInstallMode(record.mode),
    ...(record.packageBackend !== undefined && {
      packageBackend: parsePackageBackend(record.packageBackend),
    }),
    provenance: parseProvenance(record.provenance),
    artifactIntegrity: requiredString(record, "artifactIntegrity"),
    recipeIntegrity: requiredString(record, "recipeIntegrity"),
    verification: parseVerification(record.verification),
    installedAt: requiredString(record, "installedAt"),
    files: parseOwnedFiles(record.files),
    packages: parseOwnedPackages(record.packages),
    usageHints: parseUsageHints(record.usageHints),
  };
}
