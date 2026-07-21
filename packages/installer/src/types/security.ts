import type { InstallMode } from "./recipe";
import type { OriginRequest } from "./origin";

export type VerificationStatus =
  "verified" | "unverified" | "rejected" | "revoked";
export type FindingSeverity = "info" | "warning" | "error";
export type VerificationPolicy = "off" | "warn" | "require";

export interface SecurityFinding {
  code: string;
  message: string;
  severity: FindingSeverity;
}

export interface SecurityReport {
  allowed: boolean;
  findings: SecurityFinding[];
  warnings: string[];
  origin: OriginRequest;
  immutableIdentity: string;
  expectedIntegrity?: string;
  computedIntegrity: string;
  verificationSource: string;
  mode: InstallMode;
  verification: VerificationStatus;
}

export interface SecurityInput {
  origin: OriginRequest;
  immutableIdentity: string;
  expectedIntegrity?: string;
  computedIntegrity: string;
  verification: VerificationStatus;
  verificationSource: string;
  mode: InstallMode;
  policy: VerificationPolicy;
  recipe?: unknown;
  archiveFindings?: string[];
  packageScripts?: string[];
  allowScripts?: boolean;
}
