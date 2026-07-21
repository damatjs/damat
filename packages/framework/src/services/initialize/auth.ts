import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { initAuth } from "../auth";

export async function initializeAuth(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): Promise<void> {
  const auth = initAuth(config, logger);
  if (auth) instances.authRuntime = auth;
}
