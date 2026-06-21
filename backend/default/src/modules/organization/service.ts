import { ModuleService } from "@damatjs/framework";
import { collectModels } from "@damatjs/orm-model";
import { OrganizationModel } from "./models";

export const models = collectModels([OrganizationModel]);

export class OrganizationModuleService extends ModuleService({ models }) { }
