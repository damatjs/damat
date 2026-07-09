/** Code samples for the walkthrough tabs — trimmed from the guide,
 *  kept API-accurate. */

export const MODEL_SAMPLE = `import { model, columns } from "@damatjs/orm-model";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),

  // relations reference the target table name
  accounts: columns.hasMany("accounts"),
  sessions: columns.hasMany("sessions"),
})
  .indexes([columns.indexes().columns(["email"]).unique()])
  .timestamps(); // adds createdAt / updatedAt`

export const SERVICE_SAMPLE = `import { ModuleService } from "@damatjs/framework";
import { UserModel, AccountModel, SessionModel } from "./models";

export const models = {
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
};

export class UserModuleService extends ModuleService({ models }) {
  // Domain methods on top of the generated CRUD:
  async createWithAccount(email: string, provider: string) {
    return this.transaction(async () => {
      const user = await this.user.create({ data: { email } });
      await this.account.create({ data: { userId: user.id, provider } });
      return user;
    });
  }
}`

export const ROUTE_SAMPLE = `// file-based: this path becomes  GET /api/users/:userId
import { defineRoute } from "@damatjs/framework/router";
import { getModule } from "@damatjs/framework";

export const GET = defineRoute<{ userId: string }>(
  async (c, params) => {
    const users = getModule("user");
    const user = await users.user.find({
      where: { id: params.userId },
    });
    return c.json({ success: true, data: user });
  },
);`

export const WORKFLOW_SAMPLE = `import {
  createWorkflow, createStep, StepResponse, Effect,
} from "@damatjs/workflow-engine";

const createProfile = createStep<NewUser, User, string>(
  "create-profile",
  async (input) => {
    const user = await getModule("user").user.create({ data: input });
    return new StepResponse(user, user.id); // output + rollback input
  },
  async (userId) => {
    // compensation — runs if a later step fails
    await getModule("user").user.delete({ where: { id: userId } });
  },
);

export const onboarding = createWorkflow<NewUser, { user: User }>(
  "user-onboarding",
  (input, ctx) =>
    Effect.gen(function* () {
      const user = yield* createProfile(input, ctx);
      yield* sendWelcomeEmail(user, ctx, { retry: { maxAttempts: 3 } });
      return { user };
    }),
);`
