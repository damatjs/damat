import { defineModule, type ModuleInstance } from "@damatjs/services";
import type { LinkDefinition } from "./types";
import { createLinkService, type LinkService } from "./service";

/**
 * Wrap a set of links as a `defineModule`-compatible instance so the framework
 * registers it like any other module (`getModule("link")` -> the link service)
 * and the migration/codegen CLI treats `src/links` as a normal module resolver.
 *
 * `src/links/index.ts` should:
 * ```ts
 * import { defineLinkModule, collectLinkModels } from "@damatjs/framework";
 * import userOrganization from "./user-organization";
 * export const links = [userOrganization];
 * export const models = collectLinkModels(links); // for migrate + codegen
 * export default defineLinkModule(links);         // for boot
 * ```
 */
export function defineLinkModule(
  links: LinkDefinition[],
  id: string = "link",
): ModuleInstance<LinkService> {
  const Service = createLinkService(links);
  // credentials loader runs eagerly at definition time, so it must not touch the
  // database or env — the link module needs neither.
  return defineModule<LinkService>(id, {
    service: Service as unknown as new (credentials: any) => LinkService,
    credentials: () => ({}),
  });
}
