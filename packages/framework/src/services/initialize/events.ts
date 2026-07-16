import type { ILogger } from "@damatjs/logger";
import {
  connectEventBroadcast,
  disconnectEventBroadcast,
} from "@damatjs/events";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";

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
    handler: async () => {
      await disconnectEventBroadcast();
      logger.info("Event broadcast disconnected");
    },
  });
}
