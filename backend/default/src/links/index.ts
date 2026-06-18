import { defineLinkModule, collectLinkModels } from "@damatjs/framework";
import userOrganization from "./user-organization";

/** All links declared in this app. */
export const links = [userOrganization];

/**
 * Junction models for the migration + type generators. `damat-orm` discovers
 * this `models` export exactly as it does for a normal module.
 */
export const models = collectLinkModels(links);

/** Registered as the `link` module at boot — `getModule("link")` is the link service. */
export default defineLinkModule(links);
