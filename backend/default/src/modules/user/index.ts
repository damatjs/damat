import { defineModule } from "@damatjs/services";
import { UserModuleService, models } from "./service";
import credentials from "./config";

export const USER_MODULE = "user";

export { UserModuleService, models };

export default defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials,
});
