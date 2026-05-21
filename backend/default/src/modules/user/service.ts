import { ModuleService } from "@damatjs/services";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "./models";
import { schema } from "./config/schema";

class UserModuleService extends ModuleService({
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
  verification: VerificationModel,
}, schema) {

}

export default UserModuleService;
