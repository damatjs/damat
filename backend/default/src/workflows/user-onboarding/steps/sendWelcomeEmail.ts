import { createStep } from "@damatjs/workflow-engine";
import type { UserProfile, WelcomeEmailResult } from "../types";

export const sendWelcomeEmailStep = createStep<UserProfile, WelcomeEmailResult>(
  "send-welcome-email",
  async (user, _ctx) => {
    return {
      sent: true,
      emailId: `email-${user.id}-${Date.now()}`,
    };
  },
  undefined,
  {
    timeoutMs: 5_000,
    description: "Send welcome email to new user",
  }
);
