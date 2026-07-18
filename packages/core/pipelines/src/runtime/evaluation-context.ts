export interface PipelineEvaluationContext {
  input: unknown;
  trigger: Record<string, unknown>;
  nodes: Record<string, { input?: unknown; output?: unknown; error?: unknown }>;
  signal?: unknown;
  event?: unknown;
  item?: unknown;
  iteration?: number;
}

export function readReference(
  context: PipelineEvaluationContext,
  reference: string,
): unknown {
  const segments = reference.split(".").filter(Boolean);
  let value: unknown = context;
  for (const segment of segments) {
    if (!value || typeof value !== "object") return undefined;
    if (!Object.prototype.hasOwnProperty.call(value, segment)) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}
