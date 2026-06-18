import { ModuleService } from "@damatjs/framework";
import { OrganizationModel } from "./models";

export const models = {
  organization: OrganizationModel,
};

export class OrganizationModuleService extends ModuleService({ models }) {}
