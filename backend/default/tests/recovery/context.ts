import { Pool } from "@damatjs/deps/pg";
import {
  clearEventWakeupPublisher,
  clearJobWakeupPublisher,
  configureEventWakeupPublisher,
  configureJobWakeupPublisher,
  connectRedis,
  createDurabilityClient,
  disconnectRedis,
  getDurableEventDelivery,
  getJobRun,
  getRedis,
  initRedis,
  setDurabilityClient,
} from "@damatjs/framework";

export type WorkKind = "event" | "job";
export type RedisMode = "live" | "down";

export const databaseUrl = process.env.DAMAT_RECOVERY_DATABASE_URL;
export const liveRedisUrl = process.env.DAMAT_RECOVERY_REDIS_URL;
const downRedisUrl =
  process.env.DAMAT_RECOVERY_DOWN_REDIS_URL ?? "redis://127.0.0.1:1";
export const recoveryReady = Boolean(databaseUrl && liveRedisUrl);
export const pool = new Pool({ connectionString: databaseUrl });

export const recoveryRedisUrl = (mode: RedisMode) =>
  mode === "live" ? liveRedisUrl! : downRedisUrl;

export async function initializeRecovery(): Promise<void> {
  setDurabilityClient(createDurabilityClient({ pool }));
  const ready = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM pg_class
     WHERE relname=ANY($1::text[])`,
    [["_damat_job_runs", "_damat_event_outbox", "_damat_idempotency_keys"]],
  );
  if (ready.rows[0]?.count !== "3") {
    throw new Error("Recovery database needs Damat system migrations");
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS "_damat_recovery_effects" (
    "kind" text NOT NULL, "work_id" text NOT NULL, "count" int NOT NULL,
    PRIMARY KEY ("kind", "work_id"))`);
}

export async function configureRedis(mode: RedisMode): Promise<void> {
  await disconnectRedis().catch(() => {});
  const url = recoveryRedisUrl(mode);
  initRedis({
    url,
    maxRetriesPerRequest: 0,
    options: { connectTimeout: 500, retryStrategy: () => null },
  });
  const connected = await connectRedis().then(
    () => true,
    () => false,
  );
  if (mode === "live" && !connected) throw new Error("Recovery Redis is down");
  if (mode === "down" && connected) throw new Error("Down Redis is reachable");
  const publisher = getRedis();
  configureJobWakeupPublisher(publisher);
  configureEventWakeupPublisher(publisher);
}

export async function cleanupWork(
  kind: WorkKind,
  id: string,
  scope: string,
  effectId: string,
): Promise<void> {
  const table = kind === "job" ? "_damat_job_runs" : "_damat_event_outbox";
  await pool.query(`DELETE FROM "${table}" WHERE "id"=$1`, [id]);
  await pool.query(`DELETE FROM "_damat_idempotency_keys" WHERE "scope"=$1`, [
    scope,
  ]);
  await pool.query(`DELETE FROM "_damat_recovery_effects" WHERE "work_id"=$1`, [
    effectId,
  ]);
}

export async function closeRecovery(): Promise<void> {
  clearJobWakeupPublisher();
  clearEventWakeupPublisher();
  await disconnectRedis().catch(() => {});
  await pool.end();
}

export const readWork = (kind: WorkKind, id: string) =>
  kind === "job" ? getJobRun(id) : getDurableEventDelivery(id);
