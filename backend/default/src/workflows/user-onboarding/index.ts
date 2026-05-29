import { Effect } from "effect";
import { createWorkflow, executeStep } from "@damatjs/workflow-engine";
import type { UserOnboardingInput, UserOnboardingResult } from "./types";
import {
  createProfileStep,
  sendWelcomeEmailStep,
  setupDefaultsStep,
} from "./steps";

export const userOnboardingWorkflow = createWorkflow<UserOnboardingInput, UserOnboardingResult>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      const user = yield* executeStep(createProfileStep, input, ctx);
      
      const emailResult = yield* executeStep(sendWelcomeEmailStep, user, ctx);
      
      const settings = yield* executeStep(
        setupDefaultsStep,
        { user, emailSent: emailResult.sent },
        ctx
      );

      return {
        user,
        emailSent: emailResult.sent,
        settings,
      };
    }),
  {
    timeoutMs: 60_000,
  }
);

export { userOnboardingWorkflow as default };
