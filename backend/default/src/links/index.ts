import { defineLinkModule } from "@damatjs/framework";
import { links as userLinks } from "./user";

/**
 * Aggregate every owner directory's links into the single `link` runtime
 * module. `getModule("link")` resolves the link service for create / dismiss /
 * fetch / graph across all links. Migrations live per-owner (links/<owner>/migrations).
 */
export const links = [...userLinks];

export default defineLinkModule(links);
