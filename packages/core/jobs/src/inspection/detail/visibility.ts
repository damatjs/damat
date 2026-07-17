import { redactValue } from "@damatjs/durability";
import type { JobActivity, JobAttempt, JobLog } from "../../repositories";
import type { ResolvedInspectionOptions } from "../config";
import type { DetailRunRow } from "./rows";

export function visibleDetailRecords(
  row: DetailRunRow,
  attempts: JobAttempt[],
  activity: JobActivity[],
  logs: JobLog[],
  options: ResolvedInspectionOptions,
) {
  const full = options.visibility === "full";
  return {
    attempts: attempts.map((attempt) => visibleAttempt(attempt, options, full)),
    activity: activity.map((item) => ({
      ...item,
      metadata: redactRecord(item.metadata, options),
      actor: redactRecord(item.actor, options),
    })),
    logs: logs.map((log) => ({
      ...log,
      context: redactRecord(log.context, options),
    })),
    ...(row.progress !== null
      ? { progress: redactValue(row.progress, options.redaction) }
      : {}),
    ...(full && row.result !== null
      ? { result: redactValue(row.result, options.redaction) }
      : {}),
    ...(row.last_error !== null
      ? {
          lastError: redactValue(row.last_error, options.redaction) as Record<
            string,
            unknown
          >,
        }
      : {}),
  };
}

function visibleAttempt(
  attempt: JobAttempt,
  options: ResolvedInspectionOptions,
  full: boolean,
): JobAttempt {
  const { result, error, ...base } = attempt;
  return {
    ...base,
    ...(full && result !== undefined
      ? { result: redactValue(result, options.redaction) }
      : {}),
    ...(error ? { error: redactRecord(error, options) } : {}),
  } as JobAttempt;
}

function redactRecord(
  value: Record<string, unknown>,
  options: ResolvedInspectionOptions,
): Record<string, unknown> {
  return redactValue(value, options.redaction) as Record<string, unknown>;
}
