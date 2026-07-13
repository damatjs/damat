// Types matching the gateway's discovery + verdict + publish response shapes.

/** Verdict status values (mirrors the verdict blade's VerdictStatus). */
export type VerdictStatus = "unscanned" | "pending" | "pass" | "warn" | "flagged" | "malicious";

/** A single entry from GET /api/registry/packages. */
export interface PackageSummary {
  name: string;
  kind: string;
  origin: string;
  description: string | null;
}

/** Full package info from GET /api/registry/packages/:name. */
export interface PackageInfo {
  name: string;
  kind: string;
  origin: string;
  owner: string;
  description: string | null;
  versions: string[];
  latest: string | null;
  verification: { publisherId: string };
  verdict: { status: string; score: number; reasons: unknown } | null;
  capabilities?: object | null;
}

/** Verdict payload from GET /api/lookup/:name/:version.
 *  Unknown packages return { status: "unscanned" } — all other fields are null. */
export interface VerdictPayload {
  status: VerdictStatus;
  score?: number | null;
  reasons?: string[] | null;
  summary?: string | null;
  checkedAt?: string | null;
}

/** Input for publishing a package via PUT /api/npm/:name. */
export interface PublishInput {
  /** Package name, possibly scoped (e.g. "@scope/pkg"). */
  name: string;
  /** The npm publish envelope JSON body (packument + base64 _attachments). */
  body: unknown;
}

/** Result from a successful publish. */
export interface PublishResult {
  success: boolean;
  package?: { name: string; version: string };
}
