import type { ILogger } from "@damatjs/logger";

/**
 * Read DATABASE_URL from the environment, printing a helpful error and
 * exiting if it is missing.
 */
export function requireDatabaseUrl(logger: ILogger): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("");
    logger.error("DATABASE_URL is not set.");
    console.log("");
    console.log("Make sure you have a .env file with:");
    console.log("DATABASE_URL=postgresql://user:password@localhost:5432/DB");
    console.log("");
    process.exit(1);
  }
  return url;
}
