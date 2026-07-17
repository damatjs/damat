import { pool, type WorkKind } from "./context";

export async function effectState(kind: WorkKind, id: string, scope: string) {
  const result = await pool.query<{ count: number; status: string }>(
    `SELECT e."count",i."status" FROM "_damat_recovery_effects" e
     JOIN "_damat_idempotency_keys" i ON i."key"=e."work_id"
     WHERE e."kind"=$1 AND e."work_id"=$2 AND i."scope"=$3`,
    [kind, id, scope],
  );
  return result.rows[0];
}

export const effectComplete = (
  value: { count: number; status: string } | undefined,
) => value?.count === 1 && value.status === "completed";
