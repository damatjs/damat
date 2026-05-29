import { createStep } from "@damatjs/workflow-engine";
import type { UserProfile, UserSettings } from "../types";

export const setupDefaultsStep = createStep<
  { user: UserProfile; emailSent: boolean },
  UserSettings
>(
  "setup-defaults",
  async (input, _ctx) => {
    return {
      userId: input.user.id,
      theme: "system",
      notifications: true,
      language: "en",
    };
  },
  async (_input, _output, _ctx) => {
  },
  {
    timeoutMs: 5_000,
    description: "Setup default user settings",
  }
);
