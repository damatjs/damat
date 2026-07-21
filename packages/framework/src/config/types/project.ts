import { LoggerConfig } from "@damatjs/logger";
import { HttpConfig } from "./http";

export interface ProjectConfig {
  /** Immutable application release identity exposed by operational routes. */
  releaseVersion?: string;
  databaseUrl?: string;
  redisUrl?: string | undefined;
  loggerConfig?: LoggerConfig;
  nodeEnv?: "development" | "production" | "test" | undefined;
  http: HttpConfig;
}
