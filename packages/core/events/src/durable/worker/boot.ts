import { hostname } from "node:os";
import { registerWorker } from "@damatjs/durability";
import { encodeEventConsumerScope } from "./scope";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export function registerEventDeliveryWorker(
  id: string,
  options: ResolvedEventWorkerOptions,
): Promise<void> {
  return registerWorker({
    id,
    capabilities: options.consumers.map(
      ({ event, consumer }) =>
        `events:${encodeEventConsumerScope(event, consumer)}`,
    ),
    hostname: hostname(),
    processId: process.pid,
    application: {
      consumers: options.consumers.map(({ event, consumer }) =>
        encodeEventConsumerScope(event, consumer),
      ),
    },
    concurrency: options.concurrency,
  });
}
