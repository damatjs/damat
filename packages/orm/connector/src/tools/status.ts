import type { ConnectionStatus, Pool, PoolStats } from "@damatjs/orm-type";

export function fetchPoolStats(pool: Pool | null): PoolStats {
  if (!pool) {
    return { totalCount: 0, idleCount: 0, activeCount: 0, waitingCount: 0 };
  }
  const totalCount = pool.totalCount ?? 0;
  const idleCount = pool.idleCount ?? 0;
  return {
    totalCount,
    idleCount,
    activeCount: Math.max(0, totalCount - idleCount),
    waitingCount: pool.waitingCount ?? 0,
  };
}

export async function performHealthCheck(
  pool: Pool | null,
  updateStatus: (connected: boolean) => void,
): Promise<ConnectionStatus> {
  const poolStats = fetchPoolStats(pool);
  const now = new Date();

  if (!pool) {
    return {
      connected: false,
      poolStats,
      lastChecked: now,
    };
  }

  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    updateStatus(true);

    return {
      connected: true,
      poolStats: fetchPoolStats(pool),
      lastChecked: now,
    };
  } catch {
    updateStatus(false);
    return {
      connected: false,
      poolStats,
      lastChecked: now,
    };
  }
}
