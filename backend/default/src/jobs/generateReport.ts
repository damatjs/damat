import { defineJob, type JobRunContext } from "@damatjs/framework";

export const GENERATE_REPORT_JOB = "reports.generate";

export interface GenerateReportPayload {
  reportId: string;
  requestedBy: string;
}

declare module "@damatjs/jobs" {
  interface JobMap {
    "reports.generate": GenerateReportPayload;
  }
}

async function generateReport(
  payload: GenerateReportPayload,
  context: JobRunContext,
) {
  await context.progress({ percent: 25, phase: "collecting" });
  await context.log("info", "Report data collected", {
    reportId: payload.reportId,
    requestedBy: payload.requestedBy,
  });
  await context.progress({ percent: 75, phase: "rendering" });
  await context.log("info", "Report rendered", {
    reportId: payload.reportId,
  });
  await context.progress({ percent: 100, phase: "complete" });
  return { reportId: payload.reportId, status: "generated" };
}

export const generateReportJob = defineJob(
  GENERATE_REPORT_JOB,
  generateReport,
  { queue: "reports", maxAttempts: 3, backoffMs: 1_000 },
);
