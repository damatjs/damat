import type { DurabilityExecutor } from "@damatjs/durability";

export async function deleteExpiredDurableEvents(
  executor: DurabilityExecutor,
  before: Date,
  limit: number,
  selected: string | null,
): Promise<number> {
  const candidates = await executor.query<{ id: string }>(
    `SELECT o."id" FROM "_damat_event_outbox" o
     WHERE o."routed_at" IS NOT NULL AND o."retention_at"<=$1
       AND NOT EXISTS (SELECT 1 FROM "_damat_event_deliveries" active
         WHERE active."event_id"=o."id" AND active."status" NOT IN
           ('succeeded','dead_lettered','cancelled'))
       AND ($3::jsonb IS NULL OR NOT EXISTS (
         SELECT 1 FROM "_damat_event_deliveries" scoped
         WHERE scoped."event_id"=o."id" AND NOT EXISTS (
           SELECT 1 FROM jsonb_to_recordset($3::jsonb)
             AS s(event text, consumer text)
           WHERE s.event=o."name" AND s.consumer=scoped."consumer")))
     ORDER BY o."retention_at",o."id" LIMIT $2`,
    [before, limit, selected],
  );
  const ids = candidates.rows.map(({ id }) => id);
  if (!ids.length) return 0;
  await executor.query(
    `SELECT "id" FROM "_damat_event_deliveries"
     WHERE "event_id"=ANY($1::uuid[]) ORDER BY "event_id","id" FOR UPDATE`,
    [ids],
  );
  const locked = await executor.query<{ id: string }>(
    `SELECT o."id" FROM "_damat_event_outbox" o
     WHERE o."id"=ANY($1::uuid[]) AND o."retention_at"<=$2
       AND NOT EXISTS (SELECT 1 FROM "_damat_event_deliveries" active
         WHERE active."event_id"=o."id" AND active."status" NOT IN
           ('succeeded','dead_lettered','cancelled'))
       AND ($3::jsonb IS NULL OR NOT EXISTS (
         SELECT 1 FROM "_damat_event_deliveries" scoped
         WHERE scoped."event_id"=o."id" AND NOT EXISTS (
           SELECT 1 FROM jsonb_to_recordset($3::jsonb)
             AS s(event text, consumer text)
           WHERE s.event=o."name" AND s.consumer=scoped."consumer")))
     ORDER BY o."retention_at",o."id" FOR UPDATE`,
    [ids, before, selected],
  );
  const deletable = locked.rows.map(({ id }) => id);
  if (!deletable.length) return 0;
  const result = await executor.query(
    `DELETE FROM "_damat_event_outbox" WHERE "id"=ANY($1::uuid[])`,
    [deletable],
  );
  return result.rowCount ?? 0;
}
