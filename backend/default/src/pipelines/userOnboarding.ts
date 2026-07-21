import {
  definePipeline,
  registerPipelineEvent,
  registerPipelineJob,
  registerPipelineWorkflow,
} from "@damatjs/framework";
import { USER_CREATED_EVENT } from "../events";
import { GENERATE_REPORT_JOB } from "../jobs";
import { userOnboardingWorkflow } from "../workflows/user";

registerPipelineWorkflow(userOnboardingWorkflow, {
  description: "Create the user profile and its default settings",
  inputSchema: { type: "object" },
  outputSchema: { type: "object", required: ["user"] },
});
registerPipelineJob({
  name: GENERATE_REPORT_JOB,
  description: "Generate the onboarding report",
  inputSchema: {
    type: "object",
    required: ["reportId", "requestedBy"],
    properties: {
      reportId: { type: "string" },
      requestedBy: { type: "string" },
    },
  },
});
registerPipelineEvent({
  name: USER_CREATED_EVENT,
  description: "Announce a completed user onboarding",
  inputSchema: {
    type: "object",
    required: ["userId", "email"],
    properties: { userId: { type: "string" }, email: { type: "string" } },
  },
});

export const userOnboardingPipeline = definePipeline(
  "user.onboard-and-report",
  {
    version: 1,
    start: "onboard",
    inputSchema: { type: "object", required: ["user", "report"] },
    output: {
      onboarding: { $ref: "nodes.onboard.output" },
      report: { $ref: "nodes.report.output" },
    },
    nodes: [
      {
        id: "onboard",
        kind: "workflow",
        name: userOnboardingWorkflow.name,
        input: { $ref: "input.user" },
      },
      {
        id: "announce",
        kind: "event.publish",
        event: USER_CREATED_EVENT,
        input: {
          userId: { $ref: "nodes.onboard.output.user.id" },
          email: { $ref: "nodes.onboard.output.user.email" },
        },
      },
      {
        id: "report",
        kind: "job",
        name: GENERATE_REPORT_JOB,
        input: { $ref: "input.report" },
      },
    ],
    edges: [
      { from: "onboard", to: "announce" },
      { from: "announce", to: "report" },
    ],
  },
);
