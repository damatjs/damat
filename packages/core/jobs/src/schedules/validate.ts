import type { JobScheduleInput } from "./types";

export function validateJobScheduleInput(
  input: JobScheduleInput,
): JobScheduleInput {
  if ((input as { kind: string }).kind === "cron") {
    throw new Error("cron schedules are not supported in v1");
  }
  if (input.kind === "once") {
    validateDate("at", input.at);
    return input;
  }
  if (!Number.isSafeInteger(input.everyMs) || input.everyMs <= 0) {
    throw new Error("everyMs must be a positive safe integer");
  }
  if (input.startsAt) validateDate("startsAt", input.startsAt);
  return input;
}

function validateDate(name: string, value: Date): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid Date`);
  }
}
