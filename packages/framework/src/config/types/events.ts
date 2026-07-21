export interface DurableEventRouterConfig {
  pollIntervalMs?: number;
  retryIntervalMs?: number;
  batchSize?: number;
}

export interface DurableEventsServiceConfig {
  concurrency?: number;
  router?: DurableEventRouterConfig;
}

export interface EventsServiceConfig {
  broadcast?: boolean;
  /** Pub/sub channel (default "damat-events"). */
  channel?: string;
  durable?: DurableEventsServiceConfig;
}
