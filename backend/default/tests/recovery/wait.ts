import { pool, type WorkKind } from "./context";
import { getDurableEventDelivery, listJobAttempts } from "@damatjs/framework";

export * from "./worker-child";

export async function waitFor<T>(
  label: string,
  read: () => T | Promise<T>,
  ready: (value: T) => boolean,
  timeoutMs = 5_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (ready(value)) return value;
    await Bun.sleep(10);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

export async function waitForLeaseExpiry(
  kind: WorkKind,
  id: string,
): Promise<void> {
  const table = kind === "job" ? "_damat_job_runs" : "_damat_event_deliveries";
  await waitFor(
    `${kind} database-clock lease expiry`,
    async () => {
      const result = await pool.query<{ expired: boolean }>(
        `SELECT "lease_expires_at"<=clock_timestamp() AS "expired"
         FROM "${table}" WHERE "id"=$1`,
        [id],
      );
      return result.rows[0]?.expired ?? false;
    },
    Boolean,
  );
}

export async function readLease(kind: WorkKind, id: string) {
  if (kind === "job") {
    const attempt = (await listJobAttempts(id))[0]!;
    return { workerId: attempt.workerId, leaseToken: attempt.leaseToken };
  }
  const delivery = (await getDurableEventDelivery(id))!;
  return {
    workerId: delivery.leaseOwner!,
    leaseToken: delivery.leaseToken!,
  };
}
