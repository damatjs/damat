import { defineModule } from "@damatjs/framework";
import { OrganizationModuleService, models } from "./service";

export const ORGANIZATION_MODULE = "organization";

export { OrganizationModuleService, models };

export default defineModule(ORGANIZATION_MODULE, {
  service: OrganizationModuleService,
  // This module needs no credentials/env; return an empty object.
  credentials: () => ({}),
});
