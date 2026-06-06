import { createWorkflow, executeStep, Effect } from "@damatjs/workflow-engine";
import {
  createProfileStep,
  sendWelcomeEmailStep,
  setupDefaultsStep,
} from "../steps/user-onboarding";
import { NewUsers, Users, Verifications } from "@/modules/user/types";

export const userOnboardingWorkflow = createWorkflow<
  NewUsers,
  {
    user: Users;
    emailSent: boolean;
    settings: Verifications;
  }
>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      const user = yield* executeStep(createProfileStep, input, ctx);

      const emailResult = yield* executeStep(sendWelcomeEmailStep, user, ctx);

      const settings = yield* executeStep(
        setupDefaultsStep,
        { user, emailSent: emailResult.sent },
        ctx,
      );

      return {
        user,
        emailSent: emailResult.sent,
        settings,
      };
    }),
  {
    timeoutMs: 60_000,
  },
);

export { userOnboardingWorkflow as default };
