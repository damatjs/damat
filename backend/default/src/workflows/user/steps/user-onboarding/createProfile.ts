import { createStep } from "@damatjs/workflow-engine";
import type { UserOnboardingInput, UserProfile } from "@/modules/user/types/user";
import { getModule } from "@damatjs/framework";

export const createProfileStep = createStep<UserOnboardingInput, UserProfile>(
  "create-profile",
  async (input, _ctx) => {
    const userService: any = getModule("user");


    // const userService = userModule.init() as any;


    if (!userService) throw new Error("User module not loaded");


    const user = await userService.user.create({
      data: {
        email: input.email,
        name: input.name,
        // password: input.password,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      returning: ["id", "email", "name"],
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? input.name,
      created_at: user.created_at,
    };
  },
  async (_input, output, _ctx) => {
    const userService: any = getModule("user");
    if (!userService) throw new Error("User module not loaded");

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
