import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { initAuth } from "../auth";

export async function initializeAuth(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): Promise<void> {
  const auth = await initAuth(config, logger);
  if (!auth) return;
  instances.auth = auth;
  if (!auth.shutdown) return;
  instances.shutdownHandlers.push({
    name: "auth",
    handler: async () => {
      await auth.shutdown!();
      logger.info("Auth provider shut down");
    },
  });
}
