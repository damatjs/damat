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
 * import { loadEnv } from '@damatjs/utils';
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
    `.env.${environment}.local`,
    `.env.${environment}`,
    ".env.local",
    ".env",
  ];

  for (const envFile of envFiles) {
    const envPath = path.join(cwd, envFile);

    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        const parsed = parseEnvFile(content);

        // Only set if not already defined (allows system env vars to take precedence)
        for (const [key, value] of Object.entries(parsed)) {
          if (value && process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
        return;
      } catch (error) {
        console.warn(`Warning: Failed to load ${envFile}:`, error);
      }
    }
  }
}
