import type { HealthCheckResult } from "./types";

/**
 * Check health of a dependency service
 */
export async function checkDependency(
  name: string,
  check: () => Promise<boolean>,
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const healthy = await check();
    const latencyMs = Date.now() - startTime;

    return {
      status: healthy ? "healthy" : "unhealthy",
      latencyMs,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Combine multiple health check results
 */
export function combineHealthResults(
  results: Record<string, HealthCheckResult>,
): HealthCheckResult {
  const statuses = Object.values(results).map((r) => r.status);

  let status: HealthCheckResult["status"] = "healthy";
  if (statuses.some((s) => s === "unhealthy")) {
    status = "unhealthy";
  } else if (statuses.some((s) => s === "degraded")) {
    status = "degraded";
  }

  return {
    status,
    dependencies: results,
  };
}
