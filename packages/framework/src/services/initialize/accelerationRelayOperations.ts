import {
  claimAccelerationSignals,
  markAccelerationSignalPublished,
  releaseAccelerationSignal,
  updateAccelerationState,
} from "@damatjs/durability";
import { auditAccelerationRebuild } from "./accelerationAudit";
import { publishAccelerationSignal } from "./accelerationPublish";
import { rebuildReadyProjection } from "./accelerationProjection";

export const accelerationRelayOperations = {
  claim: claimAccelerationSignals,
  markPublished: markAccelerationSignalPublished,
  release: releaseAccelerationSignal,
  updateState: updateAccelerationState,
  audit: auditAccelerationRebuild,
  publish: publishAccelerationSignal,
  rebuild: rebuildReadyProjection,
};

export type AccelerationRelayOperations = typeof accelerationRelayOperations;
