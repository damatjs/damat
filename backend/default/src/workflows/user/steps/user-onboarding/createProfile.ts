import { createStep } from "@damatjs/workflow-engine";
import type { Users, NewUsers } from "@/modules/user/types";
import { getModule } from "@damatjs/framework";

export const createProfileStep = createStep<NewUsers, Users>(
  "create-profile",
  async (input, _ctx) => {
    const userService: any = getModule("user");

    // const userService = userModule.init() as any;

    if (!userService) throw new Error("User module not loaded");

    const user = (await userService.user.create({
      data: {
        email: input.email,
        name: input.name,
        // password: input.password,
        // ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      returning: ["id", "email", "name"],
    })) as Users;

    return user;
  },
  async (_input, output, _ctx) => {
    const userService: any = getModule("user");
    if (!userService) throw new Error("User module not loaded");

    await userService.user.delete({
      where: {
        id: output.id,
      },
    });
  },
  {
    timeoutMs: 10_000,
    description: "Create user profile",
  },
);
