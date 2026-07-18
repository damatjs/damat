import type { WorkActor } from "../controls";
import type { WorkKind } from "../workers";

export type RetentionDuration = number | "forever";

export interface SetRetentionOverrideInput {
  workKind: WorkKind;
  scope: string;
  retentionMs: RetentionDuration;
  actor: WorkActor;
  reason: string;
}

export interface RetentionOverride extends SetRetentionOverrideInput {
  updatedAt: Date;
}
