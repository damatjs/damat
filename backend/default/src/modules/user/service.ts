import { ModuleService } from "@damatjs/framework";
import {
  AccountModel,
  SessionModel,
  UserModel,
  VerificationModel,
} from "./models";
import { schema } from "./config/schema";

export const models = {
  verification: VerificationModel,
  session: SessionModel,
  account: AccountModel,
  user: UserModel,
};

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: schema,
}) {}
