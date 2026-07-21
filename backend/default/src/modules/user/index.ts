import { defineModule } from "@damatjs/framework";
import { UserModuleService, models } from "@user/service";

export const USER_MODULE = "user";

export { UserModuleService, models };

export default defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials: () => ({}),
});
