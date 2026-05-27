import { LoggerConfig } from '@damatjs/logger';
import { HttpConfig } from './http';

export interface ProjectConfig {
  databaseUrl?: string;
  redisUrl?: string | undefined;
  loggerConfig?: LoggerConfig;
  nodeEnv?: "development" | "production" | "test" | undefined;
  http: HttpConfig;
}
