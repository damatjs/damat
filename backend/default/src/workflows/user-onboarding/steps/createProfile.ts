import { createStep } from "@damatjs/workflow-engine";
import type { UserOnboardingInput, UserProfile } from "../types";
import { UserModuleService } from "../../../modules/user";

export const createProfileStep = createStep<UserOnboardingInput, UserProfile>(
  "create-profile",
  async (input, _ctx) => {
    const userService = new UserModuleService();

    const user = await userService.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: input.password,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      returning: ["id", "email", "name", "createdAt"],
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  },
  async (_input, output, _ctx) => {
    const userService = new UserModuleService();
    await userService.user.delete({
      where: {
        id: output.id
      }
    });
  },
  {
    timeoutMs: 10_000,
    description: "Create user profile",
  }
);
