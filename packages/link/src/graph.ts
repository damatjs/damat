/**
 * Field-tree parsing for the graph query.
 *
 * A graph query selects a tree of fields with dotted paths, e.g.
 * `["*", "organizations.*", "organizations.members.name"]`. Each path segment is
 * either a column on the current entity (a leaf) or a nested relation/link (a
 * branch whose remaining segments select fields on the related entity).
 */

export interface FieldNode {
  /** Selected columns at this level. `"*"` means "all columns". */
  columns: Set<string>;
  /** Nested selections keyed by relation/link field name. */
  children: Map<string, FieldNode>;
}

function emptyNode(): FieldNode {
  return { columns: new Set(), children: new Map() };
}

/** Parse a flat list of dotted field paths into a {@link FieldNode} tree. */
export function parseFields(fields: string[]): FieldNode {
  const root = emptyNode();
  for (const raw of fields) {
    const path = raw.trim();
    if (!path) continue;
    insertPath(root, path.split("."));
  }
  return root;
}

function insertPath(node: FieldNode, segments: string[]): void {
  const [head, ...rest] = segments;
  if (!head) return;
  if (rest.length === 0) {
    // Leaf — a column selection (including "*").
    node.columns.add(head);
    return;
  }
  let child = node.children.get(head);
  if (!child) {
    child = emptyNode();
    node.children.set(head, child);
  }
  insertPath(child, rest);
}

export interface GraphQueryConfig {
  /** Module id that owns the starting entity. */
  module: string;
  /** Model-map key of the starting entity (its service accessor). */
  entity: string;
  /** Dotted field paths to select. */
  fields: string[];
  /** Filter applied to the root entity (`where`). */
  filters?: Record<string, unknown>;
  pagination?: { skip?: number; take?: number };
  orderBy?: Array<{ column: string; direction?: "ASC" | "DESC" }>;
}

export interface GraphQueryResult<T = Record<string, any>> {
  data: T[];
}

/**
 * Reduce a fetched row to the columns requested at this node (plus any nested
 * keys already attached). A `"*"` selection keeps everything.
 */
export function pruneColumns(
  row: Record<string, any>,
  node: FieldNode,
): Record<string, any> {
  if (node.columns.has("*") || node.columns.size === 0) return row;
  const keep = new Set<string>(node.columns);
  keep.add("id");
  for (const childName of node.children.keys()) keep.add(childName);
  const out: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    if (keep.has(key)) out[key] = row[key];
  }
  return out;
}
