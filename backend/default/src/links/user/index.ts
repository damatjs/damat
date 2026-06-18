import { collectLinkModels } from "@damatjs/framework";
import userOrganization from "./models/user-organization";

/** Links owned by the user module. */
export const links = [userOrganization];

/**
 * Junction models for this link module's migrations + discovery. `damat-orm`
 * reads this `models` export exactly as it does for a normal module, so the
 * junction tables migrate from links/user/migrations.
 */
export const models = collectLinkModels(links);
