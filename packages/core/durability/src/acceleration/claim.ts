import type { QueryResultRow } from "@damatjs/deps/pg";
import { getDurabilityClient } from "../client/global";
import type { AccelerationSignal } from "./types";

interface SignalRow extends QueryResultRow {
  id: string;
  revision: string;
  topic: string;
  resource_kind: AccelerationSignal["kind"];
  resource_id: string | null;
  scope: string | null;
  payload: Record<string, unknown>;
  available_at: Date;
  claim_token: string;
}

export async function claimAccelerationSignals(
  limit = 100,
  leaseMs = 30_000,
  ids?: string[],
): Promise<AccelerationSignal[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("acceleration relay limit must be between 1 and 1000");
  }
  const token = crypto.randomUUID();
  const rows = await getDurabilityClient().transaction((executor) =>
    executor.query<SignalRow>(
      `WITH selected AS (
         SELECT "id" FROM "_damat_acceleration_outbox"
         WHERE "published_at" IS NULL AND "available_at"<=NOW()
           AND ("claim_expires_at" IS NULL OR "claim_expires_at"<=NOW())
           AND ($4::uuid[] IS NULL OR "id"=ANY($4))
         ORDER BY "revision" FOR UPDATE SKIP LOCKED LIMIT $1)
       UPDATE "_damat_acceleration_outbox" o SET "claim_token"=$2,
         "claim_expires_at"=NOW()+($3*INTERVAL '1 ms'),"attempts"="attempts"+1
       FROM selected WHERE o."id"=selected."id" RETURNING o.*`,
      [limit, token, leaseMs, ids?.length ? ids : null],
    ),
  );
  return rows.rows.map(mapSignal);
}

function mapSignal(row: SignalRow): AccelerationSignal {
  return {
    id: row.id,
    revision: String(row.revision),
    topic: row.topic,
    kind: row.resource_kind,
    ...(row.resource_id ? { resourceId: row.resource_id } : {}),
    ...(row.scope ? { scope: row.scope } : {}),
    payload: row.payload,
    availableAt: row.available_at,
    claimToken: row.claim_token,
  };
}
