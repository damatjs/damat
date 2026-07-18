import { getDurabilityClient } from "../client/global";
import { emitDurableInvalidation } from "./invalidation";
import type { AccelerationSignal } from "./types";

export async function markAccelerationSignalPublished(
  signal: AccelerationSignal,
): Promise<boolean> {
  const result = await getDurabilityClient().query(
    `UPDATE "_damat_acceleration_outbox" SET "published_at"=NOW(),
       "claim_token"=NULL,"claim_expires_at"=NULL,"last_error"=NULL
     WHERE "id"=$1 AND "claim_token"=$2 AND "published_at" IS NULL`,
    [signal.id, signal.claimToken],
  );
  if (result.rowCount !== 1) return false;
  emitDurableInvalidation({
    kind: signal.kind,
    ...(signal.resourceId ? { resourceId: signal.resourceId } : {}),
    ...(signal.scope ? { scope: signal.scope } : {}),
    revision: signal.revision,
  });
  return true;
}

export async function releaseAccelerationSignal(
  signal: AccelerationSignal,
  error: unknown,
): Promise<void> {
  await getDurabilityClient().query(
    `UPDATE "_damat_acceleration_outbox" SET "claim_token"=NULL,
       "claim_expires_at"=NULL,"last_error"=$3
     WHERE "id"=$1 AND "claim_token"=$2 AND "published_at" IS NULL`,
    [
      signal.id,
      signal.claimToken,
      error instanceof Error ? error.message : String(error),
    ],
  );
}
