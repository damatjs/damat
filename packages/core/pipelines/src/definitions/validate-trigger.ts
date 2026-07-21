import type { PipelineManifest } from "./manifest";
import { validatePipelineValue } from "./validate-value";

const KINDS = new Set(["interval", "cron", "event"]);

export function validatePipelineTriggers(manifest: PipelineManifest): void {
  const ids = new Set<string>();
  for (const trigger of manifest.triggers ?? []) {
    if (!KINDS.has(trigger.kind)) {
      throw new Error(`Unknown pipeline trigger kind "${trigger.kind}"`);
    }
    if (!trigger.id.trim() || ids.has(trigger.id)) {
      throw new Error("Pipeline trigger ids must be unique and non-empty");
    }
    ids.add(trigger.id);
    if (
      trigger.kind === "interval" &&
      (!Number.isSafeInteger(trigger.everyMs) || trigger.everyMs < 1)
    ) {
      throw new Error(`Pipeline interval trigger "${trigger.id}" is invalid`);
    }
    if (
      trigger.kind === "cron" &&
      trigger.expression.trim().split(/\s+/).length !== 5
    ) {
      throw new Error(
        `Pipeline cron trigger "${trigger.id}" must have five UTC fields`,
      );
    }
    if (trigger.kind === "event" && !trigger.event.trim()) {
      throw new Error(
        `Pipeline event trigger "${trigger.id}" requires an event`,
      );
    }
    if (trigger.input !== undefined) {
      validatePipelineValue(trigger.input, `trigger.${trigger.id}.input`);
    }
  }
}
