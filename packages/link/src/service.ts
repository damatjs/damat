import { ModuleService } from "@damatjs/services";
import type { ModelDefinition } from "@damatjs/orm-model";
import type { PgEntityManager } from "@damatjs/orm-pg";
import type { TransactionOptions } from "@damatjs/orm-type";
import type {
  LinkDefinition,
  LinkModelRef,
  LinkRowRef,
} from "./types";
import { LinkRegistry, collectLinkModels } from "./registry";
import { resolveLinkedModule } from "./resolver";
import { toCamelCase } from "./util";
import {
  parseFields,
  pruneColumns,
  type FieldNode,
  type GraphQueryConfig,
  type GraphQueryResult,
} from "./graph";

/** The subset of a model accessor (ModelMethods) the link service drives. */
interface PivotMethods {
  find(opts: any): Promise<any | null>;
  findMany(opts: any): Promise<any[]>;
  create(opts: any): Promise<any>;
  restore(opts: any): Promise<any[]>;
  softDelete(opts: any): Promise<any[]>;
  getModelDefinition(): any;
}

/**
 * The slice of the generated `ModuleService` base the link service relies on.
 * `ModuleService` over a wide `Record<string, ModelDefinition>` types its model
 * accessors as a `{ [x: string]: ModelMethods }` index signature, which would
 * clash with the link service's own methods — so we project the base onto this
 * precise shape and reach junction accessors dynamically via `#pivot`.
 */
interface LinkServiceBase {
  readonly em: PgEntityManager;
  models: ModelDefinition[];
  transaction<R>(cb: () => Promise<R>, options?: TransactionOptions): Promise<R>;
}

/**
 * Build the `LinkService` class for a set of link definitions.
 *
 * It extends `ModuleService` over the junction models so every junction table
 * gets full CRUD for free (and is registered on the shared entity manager),
 * then adds the link-specific surface: create / dismiss / list / fetch and the
 * cross-module `graph` query.
 */
export function createLinkService(links: LinkDefinition[]) {
  const models = collectLinkModels(links);
  const registry = new LinkRegistry(links);

  const Base = ModuleService({ models }) as unknown as abstract new (
    credentials?: unknown,
  ) => LinkServiceBase;

  class LinkService extends Base {
    /** The indexed link definitions backing this service. */
    readonly links = registry;

    /** The junction model accessor (ModelMethods) for a link. */
    #pivot(link: LinkDefinition): PivotMethods {
      return (this as any)[link.pivotName] as PivotMethods;
    }

    /**
     * Create a link between two rows. Idempotent: re-creating an existing link
     * returns it, and re-creating a previously dismissed (soft-deleted) link
     * revives it rather than violating the junction's unique index.
     */
    async create(from: LinkRowRef, to: LinkRowRef): Promise<Record<string, any>> {
      const o = registry.resolve(from, to);
      const pivot = this.#pivot(o.link);
      const where = { [o.fromColumn]: from.id, [o.toColumn]: to.id };

      const existing = await pivot.find({ where });
      if (existing) {
        if (existing.deleted_at) {
          const [restored] = await pivot.restore({ where });
          return restored ?? existing;
        }
        return existing;
      }
      return pivot.create({ data: where });
    }

    /** Remove a link (soft delete). Returns the number of junction rows affected. */
    async dismiss(from: LinkRowRef, to: LinkRowRef): Promise<number> {
      const o = registry.resolve(from, to);
      const rows = await this.#pivot(o.link).softDelete({
        where: { [o.fromColumn]: from.id, [o.toColumn]: to.id, deleted_at: null },
      });
      return rows.length;
    }

    /** Raw junction rows linking `from` to the `to` model (excludes dismissed). */
    async list(from: LinkRowRef, to: LinkModelRef): Promise<Record<string, any>[]> {
      const o = registry.resolve(from, to);
      return this.#pivot(o.link).findMany({
        where: { [o.fromColumn]: from.id, deleted_at: null },
      });
    }

    /** Ids of `to`-model rows linked to `from` (excludes dismissed). */
    async listLinkedIds(from: LinkRowRef, to: LinkModelRef): Promise<string[]> {
      const o = registry.resolve(from, to);
      const rows = await this.#pivot(o.link).findMany({
        where: { [o.fromColumn]: from.id, deleted_at: null },
        select: [o.toColumn],
      });
      return rows.map((r) => r[o.toColumn]).filter(Boolean);
    }

    /**
     * Fetch the full `to`-model rows linked to `from`, hydrated through the
     * target module's own service. This is the "query the link, get the linked
     * module's records" entry point.
     */
    async fetch<T = Record<string, any>>(
      from: LinkRowRef,
      to: LinkModelRef,
      opts: {
        where?: Record<string, unknown>;
        select?: string[];
        skip?: number;
        take?: number;
      } = {},
    ): Promise<T[]> {
      const o = registry.resolve(from, to);
      const ids = await this.listLinkedIds(from, to);
      if (ids.length === 0) return [];

      const moduleId = to.module ?? o.other.module;
      const svc = resolveLinkedModule(moduleId);
      const accessor = toCamelCase(to.model);
      const methods = svc[accessor];
      if (!methods) {
        throw new Error(
          `Module "${moduleId}" has no model accessor "${accessor}". ` +
            "A link endpoint's `model` must be the key in that module's `models` map.",
        );
      }
      return methods.findMany({
        ...opts,
        where: { ...(opts.where ?? {}), [o.other.primaryKey]: { in: ids } },
      });
    }

    /**
     * Resolve a tree of fields starting from one entity, following intra-module
     * relations (via the owning service's `include`) and cross-module links
     * (via the junction tables) to any depth — Damat's analogue of Medusa's
     * `query.graph`.
     */
    async graph<T = Record<string, any>>(
      config: GraphQueryConfig,
    ): Promise<GraphQueryResult<T>> {
      const tree = parseFields(config.fields);
      const data = await this.#resolveNode(config.module, config.entity, tree, {
        where: config.filters,
        skip: config.pagination?.skip,
        take: config.pagination?.take,
        orderBy: config.orderBy,
      });
      return { data: data as T[] };
    }

    async #resolveNode(
      moduleId: string,
      modelKey: string,
      node: FieldNode,
      query: {
        where?: Record<string, unknown> | undefined;
        skip?: number | undefined;
        take?: number | undefined;
        orderBy?: Array<{ column: string; direction?: "ASC" | "DESC" }> | undefined;
      },
    ): Promise<Record<string, any>[]> {
      const svc = resolveLinkedModule(moduleId);
      const methods = svc[toCamelCase(modelKey)];
      if (!methods) {
        throw new Error(
          `Graph query: module "${moduleId}" has no model accessor for "${modelKey}".`,
        );
      }

      // Classify each requested child as a cross-module link or an intra-module relation.
      const outgoing = registry.linksFrom(moduleId, modelKey);
      const relationNames = new Set<string>(
        (methods.getModelDefinition().toTableSchema().relations ?? []).map(
          (r: any) => r.from,
        ),
      );

      type LinkChild = {
        name: string;
        child: FieldNode;
        oriented: ReturnType<LinkRegistry["linksFrom"]>[number];
      };
      const linkChildren: LinkChild[] = [];
      const relationChildren: string[] = [];
      for (const [name, child] of node.children) {
        const oriented = outgoing.find(
          (o) => o.other.alias === name || o.other.model === name,
        );
        if (oriented) linkChildren.push({ name, child, oriented });
        else if (relationNames.has(name)) relationChildren.push(name);
        // Unknown child fields are ignored rather than throwing.
      }

      const rows: Record<string, any>[] = await methods.findMany({
        where: query.where,
        skip: query.skip,
        take: query.take,
        orderBy: query.orderBy,
        include: relationChildren,
      });

      // Resolve cross-module links, batched (one pivot read + one target read per link).
      for (const { name, child, oriented } of linkChildren) {
        if (rows.length === 0) break;
        const pivot = this.#pivot(oriented.link);
        const pkValues = rows.map((r) => r[oriented.self.primaryKey]).filter(Boolean);
        const pivotRows = await pivot.findMany({
          where: { [oriented.fromColumn]: { in: pkValues }, deleted_at: null },
          select: [oriented.fromColumn, oriented.toColumn],
        });

        const byFrom = new Map<string, string[]>();
        for (const pr of pivotRows) {
          const f = pr[oriented.fromColumn];
          const t = pr[oriented.toColumn];
          if (f == null || t == null) continue;
          const bucket = byFrom.get(f);
          if (bucket) bucket.push(t);
          else byFrom.set(f, [t]);
        }

        const otherIds = [
          ...new Set(pivotRows.map((pr) => pr[oriented.toColumn]).filter(Boolean)),
        ];
        const otherRows = otherIds.length
          ? await this.#resolveNode(oriented.other.module, oriented.other.model, child, {
              where: { [oriented.other.primaryKey]: { in: otherIds } },
            })
          : [];
        const otherById = new Map<string, Record<string, any>>(
          otherRows.map((o) => [o[oriented.other.primaryKey] ?? o.id, o]),
        );

        for (const row of rows) {
          const linkedIds = byFrom.get(row[oriented.self.primaryKey]) ?? [];
          const linked = linkedIds.map((id) => otherById.get(id)).filter(Boolean);
          row[name] = oriented.other.isList ? linked : (linked[0] ?? null);
        }
      }

      return rows.map((r) => pruneColumns(r, node));
    }
  }

  return LinkService;
}

export type LinkService = InstanceType<ReturnType<typeof createLinkService>>;
