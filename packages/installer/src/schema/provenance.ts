import type { ArtifactProvenance } from "../types/lockfile";
import { assertRecord, rejectUnknownKeys, requiredString } from "./assert";
import { stringRecord } from "./collections";
import { parseOriginRequest } from "./origin";

export function parseProvenance(value: unknown): ArtifactProvenance {
  const record = assertRecord(value, "provenance");
  rejectUnknownKeys(record, [
    "request",
    "immutableIdentity",
    "resolvedAt",
    "metadata",
  ]);
  return {
    request: parseOriginRequest(record.request),
    immutableIdentity: requiredString(record, "immutableIdentity"),
    resolvedAt: requiredString(record, "resolvedAt"),
    metadata: stringRecord(record.metadata, "metadata"),
  };
}
