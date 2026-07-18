import type { DurabilityClient, WorkActor } from "@damatjs/durability";
import type {
  PipelineCapabilityCatalog,
  PipelineManifest,
} from "../definitions";
import type { StoredPipelineVersion } from "../repositories";

export interface PipelineAuthoringOptions {
  client?: DurabilityClient;
}
export interface PipelineMutation {
  actor: WorkActor;
  reason: string;
  idempotencyKey: string;
}
export interface PipelineDraft {
  definitionId: string;
  name: string;
  revision: number;
  manifest: PipelineManifest;
  updatedAt: Date;
}
export interface PipelineValidationResult {
  valid: boolean;
  errors: string[];
}
export interface PipelineDefinitionSummary {
  id: string;
  name: string;
  source: "code" | "web";
  activeVersionId?: string;
  hasDraft: boolean;
  updatedAt: Date;
}
export interface PipelineLayout {
  revision: number;
  layout: Record<string, unknown>;
  actor: WorkActor;
  reason: string;
  createdAt: Date;
}

export interface PipelineAuthoringClient {
  listCapabilities(): PipelineCapabilityCatalog;
  listDefinitions(): Promise<PipelineDefinitionSummary[]>;
  listVersions(name: string): Promise<StoredPipelineVersion[]>;
  getDraft(name: string): Promise<PipelineDraft | undefined>;
  getLayout(versionId: string): Promise<PipelineLayout | undefined>;
  validate(manifest: PipelineManifest): Promise<PipelineValidationResult>;
  saveDraft(
    name: string,
    manifest: PipelineManifest,
    expectedRevision: number | undefined,
    mutation: PipelineMutation,
  ): Promise<PipelineDraft>;
  deleteDraft(
    name: string,
    expectedRevision: number,
    mutation: PipelineMutation,
  ): Promise<void>;
  cloneVersionToDraft(
    versionId: string,
    targetName: string,
    expectedRevision: number | undefined,
    mutation: PipelineMutation,
  ): Promise<PipelineDraft>;
  publishDraft(
    name: string,
    expectedRevision: number,
    mutation: PipelineMutation,
  ): Promise<StoredPipelineVersion>;
  activateVersion(
    name: string,
    versionId: string,
    mutation: PipelineMutation,
  ): Promise<void>;
  saveLayout(
    versionId: string,
    layout: Record<string, unknown>,
    mutation: PipelineMutation,
  ): Promise<number>;
  setTriggerEnabled(
    versionId: string,
    triggerId: string,
    enabled: boolean,
    mutation: PipelineMutation,
  ): Promise<void>;
}
