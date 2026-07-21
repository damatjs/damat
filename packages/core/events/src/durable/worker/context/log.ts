import {
  getDurabilityClient,
  redactValue,
  type RedactionOptions,
  type WorkLogLevel,
  type WorkLogLimits,
} from "@damatjs/durability";
import { appendEventActivity } from "../../repositories/activity";
import { assertCurrentEventDeliveryLease } from "../fence";
import type { ClaimedEventDelivery } from "../types";

export async function recordEventDeliveryLog(
  claim: ClaimedEventDelivery,
  level: WorkLogLevel,
  message: string,
  context: Record<string, unknown>,
  limits: WorkLogLimits,
  redaction: RedactionOptions,
): Promise<void> {
  await getDurabilityClient().transaction(async (executor) => {
    await assertCurrentEventDeliveryLease(executor, claim);
    const data = redactValue(context, redaction) as Record<string, unknown>;
    const totals = await executor.query<{
      count: string;
      bytes: string;
      candidate_bytes: string;
    }>(
      `SELECT COUNT(*)::text AS "count",
       COALESCE(SUM(OCTET_LENGTH("message")+OCTET_LENGTH("context"::text)),0)::text
         AS "bytes",
       (OCTET_LENGTH($3::text)+OCTET_LENGTH(($4::jsonb)::text))::text
         AS "candidate_bytes" FROM "_damat_event_logs"
       WHERE "delivery_id"=$1 AND "attempt_number"=$2`,
      [claim.id, claim.attemptCount, message, JSON.stringify(data)],
    );
    const total = totals.rows[0]!;
    if (
      +total.count >= limits.maxCount ||
      +total.bytes + +total.candidate_bytes > limits.maxBytes
    ) {
      await recordTruncation(executor, claim);
      return;
    }
    await executor.query(
      `INSERT INTO "_damat_event_logs"
       ("event_id","delivery_id","attempt_number","consumer","level",
        "message","context","worker_id","correlation_id","sequence")
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,
        COALESCE((SELECT MAX("sequence")+1 FROM "_damat_event_logs"
          WHERE "delivery_id"=$2 AND "attempt_number"=$3),1))`,
      [
        claim.eventId,
        claim.id,
        claim.attemptCount,
        claim.consumer,
        level,
        message,
        JSON.stringify(data),
        claim.workerId,
        claim.correlationId ?? null,
      ],
    );
  });
}

async function recordTruncation(
  executor: Parameters<typeof appendEventActivity>[0],
  claim: ClaimedEventDelivery,
): Promise<void> {
  const existing = await executor.query(
    `SELECT 1 FROM "_damat_event_activity" WHERE "delivery_id"=$1
     AND "attempt_number"=$2 AND "type"='logs_truncated'`,
    [claim.id, claim.attemptCount],
  );
  if (!existing.rowCount)
    await appendEventActivity(executor, {
      eventId: claim.eventId,
      deliveryId: claim.id,
      consumer: claim.consumer,
      attemptNumber: claim.attemptCount,
      type: "logs_truncated",
      workerId: claim.workerId,
      leaseToken: claim.leaseToken,
    });
}
