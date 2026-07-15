import type { SecurityReport } from "../types/security";

export function assertSecurityAllowed(report: SecurityReport): void {
  if (!report.allowed)
    throw new Error(report.findings.map(({ message }) => message).join(" "));
}
