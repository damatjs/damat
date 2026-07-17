import {
  getDurabilityClient,
  type DurabilityClient,
  type InspectionVisibility,
  type RedactionOptions,
  validateCursorSigningKey,
} from "@damatjs/durability";
import type { JobInspectionOptions } from "./types";

export interface ResolvedInspectionOptions {
  cursorSigningKey: string | Uint8Array;
  visibility: InspectionVisibility;
  redaction: RedactionOptions;
  staleAfterMs: number;
  client: DurabilityClient;
}

export function resolveInspectionOptions(
  options: JobInspectionOptions,
): ResolvedInspectionOptions {
  if (!options) throw new Error("cursorSigningKey is required");
  validateCursorSigningKey(options.cursorSigningKey);
  const staleAfterMs = options.staleAfterMs ?? 30_000;
  if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs < 1) {
    throw new Error("staleAfterMs must be a positive safe integer");
  }
  return {
    cursorSigningKey: options.cursorSigningKey,
    visibility: options.visibility ?? "metadata",
    redaction: options.redaction ?? {},
    staleAfterMs,
    client: options.client ?? getDurabilityClient(),
  };
}
