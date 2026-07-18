import type { QueryResultRow } from "@damatjs/deps/pg";
import { getDurabilityClient } from "../client/global";
import { validateWorkActor } from "../controls";
import type { RetentionOverride, SetRetentionOverrideInput } from "./types";
import { applyRetentionOverride } from "./apply";

interface OverrideRow extends QueryResultRow {
  work_kind: RetentionOverride["workKind"];
  scope: string;
  retention_ms: string | null;
  actor: RetentionOverride["actor"];
  reason: string;
  updated_at: Date;
}

export async function setRetentionOverride(
  input: SetRetentionOverrideInput,
): Promise<RetentionOverride> {
  validateInput(input);
  const retention = input.retentionMs === "forever" ? null : input.retentionMs;
  return getDurabilityClient().transaction(async (executor) => {
    const result = await executor.query<OverrideRow>(
      `INSERT INTO "_damat_retention_overrides"
        ("work_kind","scope","retention_ms","actor","reason")
       VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT ("work_kind","scope")
       DO UPDATE SET "retention_ms"=EXCLUDED."retention_ms",
         "actor"=EXCLUDED."actor","reason"=EXCLUDED."reason","updated_at"=NOW()
       RETURNING *`,
      [input.workKind, input.scope, retention, JSON.stringify(input.actor), input.reason],
    );
    await executor.query(
      `INSERT INTO "_damat_maintenance_activity"
        ("operation","work_kind","scope","status","actor","details","completed_at")
       VALUES ('retention_override',$1,$2,'completed',$3::jsonb,$4::jsonb,NOW())`,
      [input.workKind, input.scope, JSON.stringify(input.actor), JSON.stringify({ reason: input.reason, retentionMs: input.retentionMs })],
    );
    await applyRetentionOverride(executor, input);
    return mapOverride(result.rows[0]!);
  });
}

export async function getRetentionOverride(
  workKind: RetentionOverride["workKind"],
  scope: string,
): Promise<RetentionOverride | undefined> {
  const result = await getDurabilityClient().query<OverrideRow>(
    `SELECT * FROM "_damat_retention_overrides"
     WHERE "work_kind"=$1 AND "scope"=$2`,
    [workKind, scope],
  );
  return result.rows[0] ? mapOverride(result.rows[0]) : undefined;
}

function mapOverride(row: OverrideRow): RetentionOverride {
  return {
    workKind: row.work_kind,
    scope: row.scope,
    retentionMs: row.retention_ms === null ? "forever" : Number(row.retention_ms),
    actor: row.actor,
    reason: row.reason,
    updatedAt: row.updated_at,
  };
}

function validateInput(input: SetRetentionOverrideInput): void {
  validateWorkActor(input.actor);
  if (!input.scope.trim() || !input.reason.trim()) throw new Error("Retention scope and reason are required");
  if (input.retentionMs !== "forever" && (!Number.isSafeInteger(input.retentionMs) || input.retentionMs < 0)) {
    throw new Error("retentionMs must be a non-negative safe integer or forever");
  }
}
