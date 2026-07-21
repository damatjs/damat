import {
  validateWorkActor,
  withIdempotency,
  type DurabilityClient,
} from "@damatjs/durability";
import type { PipelineManifest } from "../definitions";
import type { PipelineDraft, PipelineMutation } from "./types";
import { getPipelineDraft } from "./read";
import { saveDraft } from "./draft-save";
import { validateWebPipeline } from "./validate";

export async function savePipelineDraft(
  client: DurabilityClient,
  name: string,
  manifest: PipelineManifest,
  expected: number | undefined,
  mutation: PipelineMutation,
): Promise<PipelineDraft> {
  validateMutation(name, mutation);
  await client.transaction(async (executor) => {
    await withIdempotency(
      {
        scope: `pipeline-draft-save:${name}`,
        key: mutation.idempotencyKey,
        executor,
      },
      async (transaction) => {
        const validation = await validateWebPipeline(manifest, transaction);
        if (!validation.valid) throw new Error(validation.errors.join("; "));
        return saveDraft(transaction, name, manifest, expected, mutation);
      },
    );
  });
  const draft = await getPipelineDraft(client, name);
  if (!draft) throw new Error("Saved pipeline draft was not found");
  return draft;
}

export function validateMutation(
  name: string,
  mutation: PipelineMutation,
): void {
  validateWorkActor(mutation.actor);
  if (
    !name.trim() ||
    !mutation.reason.trim() ||
    !mutation.idempotencyKey.trim()
  ) {
    throw new Error("name, reason, and idempotency key are required");
  }
}
