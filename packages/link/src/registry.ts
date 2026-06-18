import type { ModelDefinition } from "@damatjs/orm-model";
import type { LinkDefinition, ResolvedEndpoint } from "./types";

/** A link matched in a specific direction (from one endpoint to the other). */
export interface OrientedLink {
  link: LinkDefinition;
  /** The endpoint the traversal starts from. */
  self: ResolvedEndpoint;
  /** The endpoint the traversal targets. */
  other: ResolvedEndpoint;
  /** Junction column holding the `self` side's id. */
  fromColumn: string;
  /** Junction column holding the `other` side's id. */
  toColumn: string;
}

function endpointMatches(
  endpoint: ResolvedEndpoint,
  model: string,
  module?: string,
): boolean {
  if (endpoint.model !== model) return false;
  return module === undefined || endpoint.module === module;
}

/**
 * Indexes a set of link definitions so the service and graph query can answer
 * "which junction connects model A to model B, and in which direction?".
 */
export class LinkRegistry {
  constructor(readonly links: LinkDefinition[]) {}

  /**
   * Find the link connecting two models (either orientation) and return it
   * oriented from `from` to `to`. `*Module` are optional disambiguators.
   */
  resolve(
    from: { module?: string; model: string },
    to: { module?: string; model: string },
  ): OrientedLink {
    for (const link of this.links) {
      const leftIsFrom =
        endpointMatches(link.left, from.model, from.module) &&
        endpointMatches(link.right, to.model, to.module);
      const rightIsFrom =
        endpointMatches(link.right, from.model, from.module) &&
        endpointMatches(link.left, to.model, to.module);

      if (leftIsFrom) {
        return {
          link,
          self: link.left,
          other: link.right,
          fromColumn: link.leftColumn,
          toColumn: link.rightColumn,
        };
      }
      if (rightIsFrom) {
        return {
          link,
          self: link.right,
          other: link.left,
          fromColumn: link.rightColumn,
          toColumn: link.leftColumn,
        };
      }
    }
    throw new Error(
      `No link defined between "${from.model}" and "${to.model}". ` +
        `Did you register it in src/links and add the link module to your config?`,
    );
  }

  /**
   * All links that have `entity` (module + model key) on one side, each oriented
   * outward. Used by the graph query to discover which child fields are links.
   */
  linksFrom(module: string, model: string): OrientedLink[] {
    const out: OrientedLink[] = [];
    for (const link of this.links) {
      if (endpointMatches(link.left, model, module)) {
        out.push({
          link,
          self: link.left,
          other: link.right,
          fromColumn: link.leftColumn,
          toColumn: link.rightColumn,
        });
      }
      if (endpointMatches(link.right, model, module)) {
        out.push({
          link,
          self: link.right,
          other: link.left,
          fromColumn: link.rightColumn,
          toColumn: link.leftColumn,
        });
      }
    }
    return out;
  }
}

/**
 * Aggregate the junction models from a list of links into the `models` map a
 * module exports. This is what `src/links/index.ts` re-exports as `models` so
 * the migration generator and type generator discover the junction tables with
 * no special-casing.
 */
export function collectLinkModels(
  links: LinkDefinition[],
): Record<string, ModelDefinition> {
  const models: Record<string, ModelDefinition> = {};
  for (const link of links) {
    if (models[link.pivotName]) {
      throw new Error(
        `Duplicate link junction "${link.pivotName}" (table "${link.pivotTable}"). ` +
          `Two links resolve to the same junction; pass a distinct \`options.pivotTable\`.`,
      );
    }
    models[link.pivotName] = link.model;
  }
  return models;
}
