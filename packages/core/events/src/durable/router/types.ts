import type { DurabilityClient, DurabilityExecutor } from "@damatjs/durability";
import type { DurableEventRow } from "../repositories/mappers";

export interface RouteDurableEventsOptions {
  limit?: number;
  client?: DurabilityClient;
}

export interface RoutableEventRow extends DurableEventRow {}

export interface RoutingConsumer {
  name: string;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export type RoutingExecutor = DurabilityExecutor;
