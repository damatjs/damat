import { createStep } from "@damatjs/workflow-engine";
import type { Verifications, Users } from "@/modules/user/types";

export const setupDefaultsStep = createStep<
  { user: Users; emailSent: boolean },
  Verifications
>(
  "setup-defaults",
  async (input, _ctx) => {
    return {
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      id: "sda",
      identifier: input.user.email,
      value: "",
      expiresAt: new Date(),
    };
  },
  async (_input, _output, _ctx) => {},
  {
    timeoutMs: 5_000,
    description: "Setup default user settings",
  },
);
