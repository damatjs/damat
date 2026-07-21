import {
  durability,
  ensureEventStorage,
  pool,
} from "../durable/storage-context";

export { durability, pool };

export async function resetWorkerStorage(): Promise<void> {
  await ensureEventStorage();
  await pool.query(
    `TRUNCATE "_damat_event_activity", "_damat_event_logs",
      "_damat_event_delivery_attempts", "_damat_event_deliveries",
      "_damat_event_outbox" CASCADE`,
  );
}

export const uniqueEvent = (prefix: string) =>
  `${prefix}.${crypto.randomUUID()}`;
