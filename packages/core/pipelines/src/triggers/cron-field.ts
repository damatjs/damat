export function cronFieldMatches(
  field: string,
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  return field
    .split(",")
    .some((part) => matchesPart(part, value, minimum, maximum));
}

function matchesPart(
  part: string,
  value: number,
  minimum: number,
  maximum: number,
): boolean {
  const pieces = part.split("/");
  if (!part || pieces.length > 2)
    throw new Error(`Invalid cron field "${part}"`);
  const [range, stepText] = pieces;
  const step = stepText === undefined ? 1 : Number(stepText);
  if (!Number.isInteger(step) || step < 1)
    throw new Error(`Invalid cron step "${part}"`);
  if (range === "*") return (value - minimum) % step === 0;
  const [startText, endText] = range!.split("-");
  if (!startText || range!.split("-").length > 2) {
    throw new Error(`Invalid cron field "${part}"`);
  }
  const start = Number(startText);
  const end = endText === undefined ? start : Number(endText);
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < minimum ||
    end > maximum ||
    end < start
  ) {
    throw new Error(`Invalid cron field "${part}"`);
  }
  return value >= start && value <= end && (value - start) % step === 0;
}
