import { createStep, StepResponse } from "@damatjs/workflow-engine";
import type { Users, NewUsers } from "@/modules/user/types";
import { getModule } from "@damatjs/framework";

export const createProfileStep = createStep<NewUsers, Users, Users>(
  "create-profile",
  async (input, _ctx) => {
    const userService = getModule("user");

    // const userService = userModule.init() as any;

    if (!userService) throw new Error("User module not loaded");

    const user = (await userService.users.create({
      data: {
        email: input.email,
        name: input.name,
        // password: input.password,
        // ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      returning: ["id", "email", "name"],
    })) as Users;

    // output = the created user (downstream); compensateInput = the same user,
    // used to delete it if a later step fails.
    return new StepResponse(user, user);
  },
  async (user, _ctx) => {
    const userService = getModule("user");
    if (!userService) throw new Error("User module not loaded");

    await userService.users.delete({
      where: {
        id: user.id,
      },
    });
  },
  {
    timeoutMs: 10_000,
    description: "Create user profile",
  },
);
