import { getDurabilityClient } from "@damatjs/durability";
import { getPipelineCapabilityCatalog } from "../definitions";
import { activatePipelineVersion } from "./activate";
import { clonePipelineVersionToDraft } from "./clone";
import { deletePipelineDraft } from "./delete";
import { savePipelineDraft } from "./drafts";
import { savePipelineLayout } from "./layout";
import { publishPipelineDraft } from "./publish";
import {
  getPipelineDraft,
  getPipelineLayout,
  listPipelineDefinitions,
  listPipelineVersions,
} from "./read";
import { setPipelineTriggerEnabled } from "./triggers";
import type {
  PipelineAuthoringClient,
  PipelineAuthoringOptions,
} from "./types";
import { validateWebPipeline } from "./validate";

export function createPipelineAuthoringClient(
  options: PipelineAuthoringOptions = {},
): PipelineAuthoringClient {
  const client = options.client ?? getDurabilityClient();
  return {
    listCapabilities: getPipelineCapabilityCatalog,
    listDefinitions: () => listPipelineDefinitions(client),
    listVersions: (name) => listPipelineVersions(client, name),
    getDraft: (name) => getPipelineDraft(client, name),
    getLayout: (versionId) => getPipelineLayout(client, versionId),
    validate: (manifest) => validateWebPipeline(manifest, client),
    saveDraft: (name, manifest, revision, mutation) =>
      savePipelineDraft(client, name, manifest, revision, mutation),
    deleteDraft: (name, revision, mutation) =>
      deletePipelineDraft(client, name, revision, mutation),
    cloneVersionToDraft: (versionId, targetName, revision, mutation) =>
      clonePipelineVersionToDraft(
        client,
        versionId,
        targetName,
        revision,
        mutation,
      ),
    publishDraft: (name, revision, mutation) =>
      publishPipelineDraft(client, name, revision, mutation),
    activateVersion: (name, versionId, mutation) =>
      activatePipelineVersion(client, name, versionId, mutation),
    saveLayout: (versionId, layout, mutation) =>
      savePipelineLayout(client, versionId, layout, mutation),
    setTriggerEnabled: (versionId, triggerId, enabled, mutation) =>
      setPipelineTriggerEnabled(
        client,
        versionId,
        triggerId,
        enabled,
        mutation,
      ),
  };
}

export * from "./types";
