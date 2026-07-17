import type { ILogger } from "@damatjs/logger";
import {
  connectEventBroadcast,
  DurableEventRouter,
  DurableEventWorker,
  disconnectEventBroadcast,
  getAllDurableEventDefinitions,
} from "@damatjs/events";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { commonWorkerOptions } from "./workerOptions";
import { getWorkerWakeupRedis } from "./wakeup";

export async function initializeEventBroadcast(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): Promise<void> {
  if (!config.services?.events?.broadcast) return;
  if (!config.projectConfig.redisUrl) {
    logger.warn(
      "services.events.broadcast is set but projectConfig.redisUrl is not — events stay in-process",
    );
    return;
  }
  const channel = config.services.events.channel;
  await connectEventBroadcast(channel ? { channel } : {});
  instances.shutdownHandlers.push({
    name: "event-broadcast",
    phase: "claims",
    handler: async () => {
      await disconnectEventBroadcast();
      logger.info("Event broadcast disconnected");
    },
  });
}

export function initializeDurableEvents(
  config: AppConfig,
  instances: ServiceInstances,
  _logger: ILogger,
): void {
  const events = config.services?.events?.durable;
  if (!events) return;
  const wakeupRedis = getWorkerWakeupRedis(config);
  const router = new DurableEventRouter({
    ...events.router,
    ...(wakeupRedis && { wakeupRedis }),
  });
  const consumers = getAllDurableEventDefinitions().flatMap((definition) =>
    [...definition.consumers.keys()].map((consumer) => ({
      event: definition.name,
      consumer,
    })),
  );
  const worker = new DurableEventWorker({
    consumers,
    ...commonWorkerOptions(config.services?.durability),
    ...(events.concurrency !== undefined && {
      concurrency: events.concurrency,
    }),
    ...(wakeupRedis && { wakeupRedis }),
  });
  router.start();
  worker.start();
  registerStop(instances, "event-router", () => router.stop());
  registerStop(instances, "event-worker", () =>
    worker.stop(
      config.runtime?.shutdownGraceMs === undefined
        ? {}
        : { graceMs: config.runtime.shutdownGraceMs },
    ),
  );
}

function registerStop(
  instances: ServiceInstances,
  name: string,
  handler: () => Promise<void>,
): void {
  instances.shutdownHandlers.push({ name, phase: "claims", handler });
}
