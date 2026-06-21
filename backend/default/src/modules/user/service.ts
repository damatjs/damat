import { ModuleService } from "@damatjs/framework";
import { collectModels } from "@damatjs/orm-model";
import {
  AccountModel,
  SessionModel,
  UserModel,
  VerificationModel,
} from "./models";
import { schema } from "./config/schema";

export const models = collectModels([
  VerificationModel,
  SessionModel,
  AccountModel,
  UserModel,
]);

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: schema,
}) { }
