import type {
  BoundedRetentionRequest,
  CursorPage,
  CursorSigningKey,
  DurabilityClient,
  InspectionVisibility,
  RedactionOptions,
  WorkActor,
  WorkSummaryFilter,
} from "@damatjs/durability";
import type { DurableEventDelivery } from "../repositories";
import type { EventRetentionResult } from "../worker";
import type { EventOperationalSummary } from "./summary-types";
import type {
  DurableEventDetail,
  DurableEventFilter,
  EventSummary,
} from "./types";

export interface DurableEventInspectionOptions {
  cursorSigningKey: CursorSigningKey;
  visibility?: InspectionVisibility;
  redaction?: RedactionOptions;
  staleAfterMs?: number;
  client?: DurabilityClient;
}

export interface DurableEventInspectionClient {
  listEvents(filter?: DurableEventFilter): Promise<CursorPage<EventSummary>>;
  getEvent(id: string): Promise<DurableEventDetail | null>;
  getSummary(filter: WorkSummaryFilter): Promise<EventOperationalSummary>;
  cancelDelivery(
    id: string,
    actor: WorkActor,
    reason?: string,
  ): Promise<DurableEventDelivery>;
  retryDelivery(id: string, actor: WorkActor): Promise<DurableEventDelivery>;
  pauseConsumer(
    event: string,
    consumer: string,
    actor: WorkActor,
    reason?: string,
  ): Promise<void>;
  resumeConsumer(
    event: string,
    consumer: string,
    actor: WorkActor,
  ): Promise<void>;
  runRetention(
    request: BoundedRetentionRequest,
    actor: WorkActor,
  ): Promise<EventRetentionResult>;
}
