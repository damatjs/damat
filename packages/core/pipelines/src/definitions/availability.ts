import { getDurableEventDefinition } from "@damatjs/events";
import { getJobDefinition } from "@damatjs/jobs";
import type { PipelineManifest } from "./manifest";
import { getPipelineRuntimeSupport } from "./settings";
import {
  getPipelineAction,
  getPipelineCapabilityCatalog,
  getPipelineWorkflow,
} from "./capabilities";

export function pipelineCapabilityErrors(
  manifest: PipelineManifest,
  webSafe = false,
): string[] {
  const catalog = getPipelineCapabilityCatalog();
  const webJobs = new Set(catalog.jobs.map((value) => value.name));
  const webEvents = new Set(catalog.events.map((value) => value.name));
  const support = getPipelineRuntimeSupport();
  const errors: string[] = [];
  for (const node of manifest.nodes) {
    if (node.kind === "action" && !getPipelineAction(node.name))
      errors.push(`Unknown action "${node.name}"`);
    if (node.kind === "workflow" && !getPipelineWorkflow(node.name))
      errors.push(`Unknown workflow "${node.name}"`);
    if (node.kind === "job" && !getJobDefinition(node.name))
      errors.push(`Unknown job "${node.name}"`);
    else if (node.kind === "job" && !support.jobs) {
      errors.push("Job nodes require services.jobs");
    } else if (node.kind === "job" && webSafe && !webJobs.has(node.name)) {
      errors.push(
        `Job "${node.name}" is not available to web-authored pipelines`,
      );
    }
    if (
      (node.kind === "event.publish" || node.kind === "event.wait") &&
      !getDurableEventDefinition(node.event)
    )
      errors.push(`Unknown durable event "${node.event}"`);
    else if (
      (node.kind === "event.publish" || node.kind === "event.wait") &&
      !support.events
    )
      errors.push("Event nodes require services.events.durable");
    else if (
      (node.kind === "event.publish" || node.kind === "event.wait") &&
      webSafe &&
      !webEvents.has(node.event)
    ) {
      errors.push(
        `Event "${node.event}" is not available to web-authored pipelines`,
      );
    }
    const compensation = node.compensateWith;
    if (
      compensation?.kind === "action" &&
      !getPipelineAction(compensation.name)
    ) {
      errors.push(`Unknown compensation action "${compensation.name}"`);
    }
    if (
      compensation?.kind === "workflow" &&
      !getPipelineWorkflow(compensation.name)
    ) {
      errors.push(`Unknown compensation workflow "${compensation.name}"`);
    }
    if (compensation?.kind === "job" && !getJobDefinition(compensation.name)) {
      errors.push(`Unknown compensation job "${compensation.name}"`);
    } else if (compensation?.kind === "job" && !support.jobs) {
      errors.push("Compensation job nodes require services.jobs");
    } else if (
      compensation?.kind === "job" &&
      webSafe &&
      !webJobs.has(compensation.name)
    ) {
      errors.push(`Compensation job "${compensation.name}" is not web-safe`);
    }
  }
  for (const trigger of manifest.triggers ?? []) {
    if (trigger.kind !== "event") continue;
    if (!getDurableEventDefinition(trigger.event)) {
      errors.push(`Unknown durable trigger event "${trigger.event}"`);
    } else if (!support.events) {
      errors.push("Event triggers require services.events.durable");
    } else if (webSafe && !webEvents.has(trigger.event)) {
      errors.push(`Trigger event "${trigger.event}" is not web-safe`);
    }
  }
  return errors;
}
