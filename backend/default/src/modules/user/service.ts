import { ModuleService } from "@damatjs/framework";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "./models";
import { schema } from "./config/schema";

export const models = {
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
  verification: VerificationModel,
};

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: schema,
}) { }
