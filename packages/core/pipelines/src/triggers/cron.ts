import { cronFieldMatches } from "./cron-field";

export function nextCronOccurrence(expression: string, after: Date): Date {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5)
    throw new Error("Cron expressions require five UTC fields");
  const candidate = new Date(after);
  candidate.setUTCSeconds(0, 0);
  candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  const end = candidate.getTime() + 366 * 2 * 24 * 60 * 60 * 1_000;
  while (candidate.getTime() <= end) {
    if (matches(fields, candidate)) return candidate;
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  throw new Error(
    `Cron expression has no occurrence within two years: ${expression}`,
  );
}

function matches(fields: string[], value: Date): boolean {
  const dayOfMonth = cronFieldMatches(fields[2]!, value.getUTCDate(), 1, 31);
  const weekday = value.getUTCDay();
  const dayOfWeek =
    cronFieldMatches(fields[4]!, weekday, 0, 7) ||
    (weekday === 0 && cronFieldMatches(fields[4]!, 7, 0, 7));
  const dayMatches =
    fields[2] !== "*" && fields[4] !== "*"
      ? dayOfMonth || dayOfWeek
      : dayOfMonth && dayOfWeek;
  return (
    cronFieldMatches(fields[0]!, value.getUTCMinutes(), 0, 59) &&
    cronFieldMatches(fields[1]!, value.getUTCHours(), 0, 23) &&
    cronFieldMatches(fields[3]!, value.getUTCMonth() + 1, 1, 12) &&
    dayMatches
  );
}
