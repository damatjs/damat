import {
  subscribeDurableInvalidations,
  type DurableInvalidation,
} from "@damatjs/durability";

export type PipelineInvalidation = DurableInvalidation & { kind: "pipeline" };

export function subscribePipelineInvalidations(
  listener: (event: PipelineInvalidation) => void,
): () => void {
  return subscribeDurableInvalidations((event) => {
    if (event.kind === "pipeline") listener(event as PipelineInvalidation);
  });
}
