import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { bindProviders } from "../providers";

export async function initializeProviders(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): Promise<void> {
  instances.providers = bindProviders(config.providers, logger);
}
