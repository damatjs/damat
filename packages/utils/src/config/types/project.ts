/**
 * Project Configuration Types
 *
 * Types for project-level configuration (database, server, etc.)
 */

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
  databaseUrl: string;
  /** Redis connection URL */
  redisUrl?: string | undefined;
  /** Log level */
  logLevel?: "debug" | "info" | "warn" | "error" | undefined;
  /** Log format */
  logFormat?: "pretty" | "json" | undefined;
  /** Node environment */
  nodeEnv?: "development" | "production" | "test" | undefined;
  /** HTTP server configuration */
  http: HttpConfig;
}
