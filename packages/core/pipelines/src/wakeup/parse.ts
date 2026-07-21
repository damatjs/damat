import type { PipelineWakeupMessage } from "./types";

export function parsePipelineWakeup(
  message: string,
): PipelineWakeupMessage | undefined {
  try {
    const value = JSON.parse(message) as Record<string, unknown>;
    if (value.kind !== "pipelines") return undefined;
    return {
      kind: "pipelines",
      ...(typeof value.scope === "string" ? { scope: value.scope } : {}),
    };
  } catch {
    return undefined;
  }
}
