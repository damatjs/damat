/**
 * Link Module - Link Container
 *
 * Container for managing cross-module relationships.
 */

import type { LinkDefinition, LoadedLink } from "./types";

/**
 * Link container - stores all cross-module relationships
 */
export class LinkContainer {
  private links = new Map<string, LoadedLink>();

  /**
   * Register a link
   */
  register(definition: LinkDefinition): LoadedLink {
    // For many-to-many, create a junction table name
    const loadedLink: LoadedLink = {
      definition,
    };

    if (definition.relationship === "many-to-many") {
      loadedLink.tableName = `${definition.name}_link`;
    }

    this.links.set(definition.name, loadedLink);
    return loadedLink;
  }

  /**
   * Get a link by name
   */
  get(name: string): LoadedLink | undefined {
    return this.links.get(name);
  }

  /**
   * Get all links
   */
  getAll(): LoadedLink[] {
    return Array.from(this.links.values());
  }

  /**
   * Get all links involving a specific module
   */
  getByModule(moduleName: string): LoadedLink[] {
    return this.getAll().filter(
      (link) =>
        link.definition.from.module === moduleName ||
        link.definition.to.module === moduleName,
    );
  }

  /**
   * Unregister a link
   */
  unregister(name: string): void {
    this.links.delete(name);
  }

  /**
   * Check if removing a module would affect any links
   */
  getAffectedLinks(moduleName: string): string[] {
    return this.getByModule(moduleName).map((l) => l.definition.name);
  }
}
