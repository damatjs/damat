export type JobInspectionErrorCode = "NOT_FOUND" | "INVALID_TRANSITION";

export class JobInspectionError extends Error {
  constructor(
    readonly code: JobInspectionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "JobInspectionError";
  }
}

export function notFound(kind: string, id: string): JobInspectionError {
  return new JobInspectionError("NOT_FOUND", `${kind} not found: ${id}`);
}

export function invalidTransition(message: string): JobInspectionError {
  return new JobInspectionError("INVALID_TRANSITION", message);
}
