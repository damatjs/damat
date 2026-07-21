import type { DurabilityExecutor } from "@damatjs/durability";
import type { EventDeliveryClaimRow } from "./claim-row";
import type { ClaimEventDeliveriesOptions } from "./types";
import { encodeEventConsumerScope } from "./scope";

export async function selectEventDeliveryClaims(
  executor: DurabilityExecutor,
  options: ClaimEventDeliveriesOptions,
): Promise<EventDeliveryClaimRow[]> {
  if (!options.consumers.length) return [];
  const identities = new Map(
    options.consumers.map((identity) => [
      encodeEventConsumerScope(identity.event, identity.consumer),
      identity,
    ]),
  );
  const selected = JSON.stringify(
    [...identities].map(([scope, identity]) => ({
      ...identity,
      scope,
    })),
  );
  const result = await executor.query<EventDeliveryClaimRow>(
    `SELECT d.*, o."name" AS "event_name", o."payload", o."metadata",
       o."correlation_id", o."causation_id", d."status" AS "previous_status"
     FROM "_damat_event_deliveries" d
     JOIN "_damat_event_outbox" o ON o."id"=d."event_id"
     JOIN jsonb_to_recordset($1::jsonb)
       AS s(event text, consumer text, scope text)
       ON s.event=o."name" AND s.consumer=d."consumer"
     WHERE ((d."status"='pending' AND d."available_at"<=NOW())
       OR (d."status"='running' AND d."lease_expires_at"<=NOW()))
       AND NOT EXISTS (SELECT 1 FROM "_damat_work_controls" c
         WHERE c."work_kind"='event' AND c."paused"=TRUE
           AND c."scope"=s.scope)
     ORDER BY d."available_at", d."created_at", d."id"
     FOR UPDATE OF d SKIP LOCKED LIMIT $2`,
    [selected, options.limit],
  );
  return result.rows;
}
