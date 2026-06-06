import { ModuleService } from "@damatjs/framework";
import {
  UserModel,
  AccountModel,
  SessionModel,
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
