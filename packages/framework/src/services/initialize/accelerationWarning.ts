import type { ILogger } from "@damatjs/logger";

export function warnAccelerationUnavailable(
  logger: ILogger,
  error: unknown,
  fallbackPollIntervalMs: number,
  redisUser: string,
): void {
  logger.warn("Durability Redis acceleration unavailable", {
    redisUser,
    error: error instanceof Error ? error.message : String(error),
    deniedCapability: capability(error),
    requiredChannels: ["&damat:*", "&damat-events"],
    fallbackStatus: "PostgreSQL polling active",
    fallbackPollIntervalMs,
  });
}

function capability(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SUBSCRIBE")) return "SUBSCRIBE";
  if (message.includes("PUBLISH")) return "PUBLISH";
  return "Redis coordination";
}
