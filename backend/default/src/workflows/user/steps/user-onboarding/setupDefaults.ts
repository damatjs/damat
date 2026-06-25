import { createStep, StepResponse } from "@damatjs/workflow-engine";
import type { Verifications, Users } from "@/modules/user/types";

export const setupDefaultsStep = createStep<
  { user: Users; emailSent: boolean },
  Verifications
>(
  "setup-defaults",
  async (input, _ctx) => {
    // Nothing to roll back → output only, no compensation function.
    return new StepResponse({
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      id: "sda",
      identifier: input.user.email,
      value: "",
      expiresAt: new Date(),
    });
  },
  undefined,
  {
    timeoutMs: 5_000,
    description: "Setup default user settings",
  },
);
