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
  /** Database connection URL */
  databaseUrl?: string;
  /** Redis connection URL */
  redisUrl?: string | undefined;
  /** Logger */
  loggerConfig?: LoggerConfig;
  /** Node environment */
  nodeEnv?: "development" | "production" | "test" | undefined;
  /** HTTP server configuration */
  http: HttpConfig;
}
