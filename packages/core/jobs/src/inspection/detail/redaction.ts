import {
  redactValue,
  type WorkActor,
  type WorkerRecord,
} from "@damatjs/durability";
import type { ResolvedInspectionOptions } from "../config";
import type { VisibleWorkerRecord } from "../contracts/records";
import type { VisibleJobSchedule } from "../types";
import type { readOperationalHistory } from "./history";
import type { readScheduleHistory } from "./schedule";

type OperationalHistory = Awaited<ReturnType<typeof readOperationalHistory>>;
type ScheduleHistory = Awaited<ReturnType<typeof readScheduleHistory>>;
type VisibleOperationalHistory = Omit<OperationalHistory, "workers"> & {
  workers: VisibleWorkerRecord[];
};

export function visibleOperationalHistory(
  history: OperationalHistory,
  options: ResolvedInspectionOptions,
): VisibleOperationalHistory {
  return {
    ...history,
    workers: history.workers.map((worker) => visibleWorker(worker, options)),
    controlActivity: history.controlActivity.map((item) => ({
      ...item,
      actor: redactActor(item.actor, options),
    })),
  };
}

function visibleWorker(
  worker: WorkerRecord,
  options: ResolvedInspectionOptions,
): VisibleWorkerRecord {
  const { application, deployment, ...base } = worker;
  return {
    ...base,
    ...(options.visibility !== "hidden"
      ? {
          application: redactRecord(application, options),
          deployment: redactRecord(deployment, options),
        }
      : {}),
  };
}

export function visibleScheduleHistory(
  history: ScheduleHistory,
  options: ResolvedInspectionOptions,
): {
  schedule?: VisibleJobSchedule;
  scheduleActivity: ScheduleHistory["scheduleActivity"];
} {
  return {
    ...(history.schedule
      ? { schedule: visibleSchedule(history.schedule, options) }
      : {}),
    scheduleActivity: history.scheduleActivity.map((item) => ({
      ...item,
      metadata: redactRecord(item.metadata, options),
      actor: redactRecord(item.actor, options),
    })),
  };
}

function visibleSchedule(
  schedule: NonNullable<ScheduleHistory["schedule"]>,
  options: ResolvedInspectionOptions,
): VisibleJobSchedule {
  const { payload, metadata, ...base } = schedule;
  return {
    ...base,
    ...(options.visibility === "full"
      ? { payload: redactValue(payload, options.redaction) }
      : {}),
    ...(options.visibility !== "hidden"
      ? { metadata: redactRecord(metadata, options) }
      : {}),
  };
}

function redactActor(
  actor: WorkActor,
  options: ResolvedInspectionOptions,
): WorkActor {
  return {
    ...actor,
    ...(actor.metadata
      ? { metadata: redactRecord(actor.metadata, options) }
      : {}),
  };
}

function redactRecord(
  value: Record<string, unknown>,
  options: ResolvedInspectionOptions,
): Record<string, unknown> {
  return redactValue(value, options.redaction) as Record<string, unknown>;
}
