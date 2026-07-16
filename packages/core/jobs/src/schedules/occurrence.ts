import type { JobScheduleInput } from "./types";
import { validateJobScheduleInput } from "./validate";

export function nextScheduleOccurrence(
  input: JobScheduleInput,
  after = new Date(),
): Date | undefined {
  validateJobScheduleInput(input);
  if (input.kind === "once") {
    return input.at.getTime() > after.getTime() ? input.at : undefined;
  }
  const start = input.startsAt ?? after;
  if (start.getTime() > after.getTime()) return start;
  const elapsed = after.getTime() - start.getTime();
  return new Date(
    start.getTime() + (Math.floor(elapsed / input.everyMs) + 1) * input.everyMs,
  );
}

export function initialScheduleOccurrence(
  input: JobScheduleInput,
  now = new Date(),
): Date {
  validateJobScheduleInput(input);
  if (input.kind === "once") return input.at;
  return input.startsAt ?? now;
}
