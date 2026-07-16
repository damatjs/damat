import type { QueryResultRow } from "@damatjs/deps/pg";
import type {
  MaintenanceActivity,
  MaintenanceStatus,
  WorkActor,
  WorkControl,
  WorkControlActivity,
} from "./types";
import type { WorkKind } from "../workers/types";

export interface ControlRow extends QueryResultRow {
  work_kind: WorkKind;
  scope: string;
  paused: boolean;
  reason: string | null;
  actor: WorkActor;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityRow extends QueryResultRow {
  id: string;
  work_kind: WorkKind;
  scope: string;
  action: "paused" | "resumed";
  reason: string | null;
  actor: WorkActor;
  created_at: Date;
}

export interface MaintenanceRow extends QueryResultRow {
  id: string;
  operation: string;
  work_kind: WorkKind | null;
  scope: string | null;
  status: MaintenanceStatus;
  actor: WorkActor;
  details: Record<string, unknown>;
  created_at: Date;
  completed_at: Date | null;
}

export function mapControl(row: ControlRow): WorkControl {
  return {
    kind: row.work_kind,
    scope: row.scope,
    paused: row.paused,
    ...(row.reason ? { reason: row.reason } : {}),
    actor: row.actor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapActivity(row: ActivityRow): WorkControlActivity {
  return {
    id: String(row.id),
    kind: row.work_kind,
    scope: row.scope,
    action: row.action,
    ...(row.reason ? { reason: row.reason } : {}),
    actor: row.actor,
    createdAt: row.created_at,
  };
}

export function mapMaintenance(row: MaintenanceRow): MaintenanceActivity {
  return {
    id: String(row.id),
    operation: row.operation,
    ...(row.work_kind ? { kind: row.work_kind } : {}),
    ...(row.scope ? { scope: row.scope } : {}),
    status: row.status,
    actor: row.actor,
    details: row.details,
    createdAt: row.created_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}
