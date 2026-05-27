import { LoggerConfig } from '@damatjs/logger';

/**
 * HTTP server configuration
 */
export interface HttpConfig {
  port: number;
  host: string;
  corsOrigin: string;
  jwtSecret: string;
  cookieSecret: string;
  apiBaseUrl?: string | undefined;
}

/**
 * Project-level configuration.
 * Contains infrastructure settings - database, server, etc.
 */
export interface ProjectConfig {
  databaseUrl?: string;
  redisUrl?: string | undefined;
  loggerConfig?: LoggerConfig;
  nodeEnv?: "development" | "production" | "test" | undefined;
  http: HttpConfig;
}
