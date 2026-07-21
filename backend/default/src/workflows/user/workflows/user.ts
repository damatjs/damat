import { createWorkflow, Effect } from "@damatjs/workflow-engine";
import {
  createProfileStep,
  sendWelcomeEmailStep,
  setupDefaultsStep,
} from "../steps/user-onboarding";
import { NewUsers, Users } from "@/modules/user/types";
import {
  serializeVerification,
  type SerializedVerification,
} from "./serialize";

export const userOnboardingWorkflow = createWorkflow<
  NewUsers,
  {
    user: Users;
    emailSent: boolean;
    settings: SerializedVerification;
  }
>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      // Steps are callable directly: `step(input, ctx)` ≡
      // `executeStep(step, input, ctx)`.
      const user = yield* createProfileStep(input, ctx);

      // The optional third argument overrides retry/timeout for this call only
      // — handy for a flaky external send — without touching the step itself.
      const emailResult = yield* sendWelcomeEmailStep(user, ctx, {
        timeoutMs: 15_000,
        retry: { maxAttempts: 3 },
      });

      const settings = yield* setupDefaultsStep(
        { user, emailSent: emailResult.sent },
        ctx,
      );

      return {
        user,
        emailSent: emailResult.sent,
        settings: serializeVerification(settings),
      };
    }),
  {
    timeoutMs: 60_000,
  },
);

export { userOnboardingWorkflow as default };
