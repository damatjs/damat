import { redactValue } from "@damatjs/durability";
import type { PipelineManifest } from "../definitions";
import type { ResolvedPipelineInspectionOptions } from "./config";
import type { TransitionRow } from "./detail-rows";

const nodeKeys = [
  "id",
  "kind",
  "name",
  "event",
  "signal",
  "pipeline",
  "delayMs",
  "maxItems",
  "concurrency",
  "maxIterations",
  "failure",
  "join",
  "retry",
] as const;
const edgeKeys = ["from", "to", "on", "label"] as const;
const triggerKeys = [
  "id",
  "kind",
  "enabled",
  "event",
  "everyMs",
  "expression",
] as const;

export function visibleManifest(
  manifest: PipelineManifest,
  options: ResolvedPipelineInspectionOptions,
): Record<string, unknown> {
  if (options.visibility !== "hidden") {
    return redactValue(manifest, options.redaction) as Record<string, unknown>;
  }
  return {
    start: manifest.start,
    nodes: manifest.nodes.map((node) => pick(node, nodeKeys)),
    edges: manifest.edges.map((edge) => pick(edge, edgeKeys)),
    ...(manifest.triggers
      ? {
          triggers: manifest.triggers.map((trigger) =>
            pick(trigger, triggerKeys),
          ),
        }
      : {}),
    inspection: { visibility: "hidden" },
  };
}

export function visibleTransitions(
  rows: TransitionRow[],
  options: ResolvedPipelineInspectionOptions,
): unknown[] {
  if (options.visibility !== "hidden") {
    return redactValue(rows, options.redaction) as unknown[];
  }
  return rows.map((row) => ({ ...row, edge: pick(row.edge, edgeKeys) }));
}

function pick(value: object, keys: readonly string[]): Record<string, unknown> {
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    keys.flatMap((key) =>
      record[key] === undefined ? [] : [[key, record[key]]],
    ),
  );
}
