import { ModuleService } from "@damatjs/services";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "./models";
import type { schemaType } from "./config/schema";


export class UserModuleService extends ModuleService(
  {
    user: UserModel,
    account: AccountModel,
    session: SessionModel,
    verification: VerificationModel,
  }, schemaType) {
  async findByEmail(email: string) {
    return this.user.find({ where: { email } as any });
  }
}

export type { models };
