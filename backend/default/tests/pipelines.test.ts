import { expect, test } from "bun:test";
import {
  getPipelineCapabilityCatalog,
  getPipelineDefinition,
  pipelineCapabilityErrors,
} from "@damatjs/framework";
import { userOnboardingPipeline } from "@/pipelines";

test("reference backend registers a workflow, job, and event pipeline", () => {
  expect(getPipelineDefinition(userOnboardingPipeline.name)).toBe(
    userOnboardingPipeline,
  );
  expect(pipelineCapabilityErrors(userOnboardingPipeline.manifest)).toEqual([]);
  const capabilities = getPipelineCapabilityCatalog();
  expect(capabilities.workflows.map((value) => value.name)).toContain(
    "user-onboarding",
  );
  expect(capabilities.jobs.map((value) => value.name)).toContain(
    "reports.generate",
  );
  expect(capabilities.events.map((value) => value.name)).toContain(
    "user.created",
  );
});
