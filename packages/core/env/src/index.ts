/**
 * Config Module - Environment Loading
 *
 * Utilities for loading environment variables from .env files.
 */

import fs from "node:fs";
import path from "node:path";
import { parseEnvFile } from './parseEnvFile';

/**
 * Load environment variables from .env files.
 *
 * Loads in order (later files override earlier):
 * 1. .env
 * 2. .env.local
 * 3. .env.{environment}
 * 4. .env.{environment}.local
 *
 * @param environment - Environment name (e.g., 'development', 'production')
 * @param cwd - Current working directory to search for .env files
 *
 * @example
 * ```typescript
 * import { loadEnv } from '@damatjs/load-env';
 *
 * // Load environment variables before defining config
 * loadEnv(process.env.NODE_ENV || 'development', process.cwd());
 * ```
 */
export function loadEnv(
  environment: string = "development",
  cwd: string = process.cwd(),
): void {
  const envFiles = [
    ".env",
    ".env.local",
    `.env.${environment}`,
    `.env.${environment}.local`,
  ];

  const preexisting = new Set(Object.keys(process.env));

  for (const envFile of envFiles) {
    const envPath = path.join(cwd, envFile);

    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        const parsed = parseEnvFile(content);

        for (const [key, value] of Object.entries(parsed)) {
          if (value && !preexisting.has(key)) {
            process.env[key] = value;
          }
        }
      } catch (error) {
        console.warn(`Warning: Failed to load ${envFile}:`, error);
      }
    }
  }
}
