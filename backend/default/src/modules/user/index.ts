import { defineModule } from "@damatjs/framework";
import { UserModuleService, models } from "@user/service";
import credentials from "@user/config";

export const USER_MODULE = "user";

export { UserModuleService, models };

export default defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials: credentials.load
});
