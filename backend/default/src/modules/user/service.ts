import { ModuleService } from "@damatjs/services";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "./models";
import type { schemaType } from "./config/schema";

const models = {
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
  verification: VerificationModel,
} as const;

export class UserModuleService extends ModuleService<typeof models, schemaType>(models) {
  async findByEmail(email: string) {
    return this.user.findOne({ where: { email } as any });
  }
}

export type { models };
