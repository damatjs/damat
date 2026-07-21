import {
  getDurabilityClient,
  validateCursorSigningKey,
  type DurabilityClient,
  type InspectionVisibility,
  type RedactionOptions,
} from "@damatjs/durability";
import type { PipelineInspectionOptions } from "./types";
import type { PipelineManifest } from "../definitions";

export interface ResolvedPipelineInspectionOptions {
  cursorSigningKey: string | Uint8Array;
  visibility: InspectionVisibility;
  redaction: RedactionOptions;
  client: DurabilityClient;
}

export function inspectionOptionsForManifest(
  options: ResolvedPipelineInspectionOptions,
  manifest: PipelineManifest,
): ResolvedPipelineInspectionOptions {
  return manifest.inspection?.visibility
    ? { ...options, visibility: manifest.inspection.visibility }
    : options;
}

export function resolvePipelineInspectionOptions(
  options: PipelineInspectionOptions,
): ResolvedPipelineInspectionOptions {
  if (!options) throw new Error("cursorSigningKey is required");
  validateCursorSigningKey(options.cursorSigningKey);
  return {
    cursorSigningKey: options.cursorSigningKey,
    visibility: options.visibility ?? "metadata",
    redaction: options.redaction ?? {},
    client: options.client ?? getDurabilityClient(),
  };
}
