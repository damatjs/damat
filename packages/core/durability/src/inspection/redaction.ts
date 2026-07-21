import type { InspectionVisibility } from "./types";

export interface InspectionValue<TPayload = unknown> {
  payload: TPayload;
  metadata: Record<string, unknown>;
}

export function applyInspectionVisibility(
  value: InspectionValue,
  visibility: InspectionVisibility,
): Partial<InspectionValue> {
  if (visibility === "full") return value;
  if (visibility === "metadata") return { metadata: value.metadata };
  return {};
}
