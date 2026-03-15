import type { ModuleSnapshot } from "../../types/snapshot";
import type { SchemaDiff } from "../../types/diff";
import { diffSnapshots as _diffSnapshots } from "../../diff/diffSchemas";

export type { SchemaDiff };

/**
 * The result of comparing two snapshots — re-exported from types/diff for
 * convenience when importing from the snapshot layer.
 */

/**
 * Compute the structural difference between two snapshots.
 * Delegates to the diff layer.
 */
export function diffSnapshots(
  previous: ModuleSnapshot,
  current: ModuleSnapshot,
): SchemaDiff {
  return _diffSnapshots(previous, current);
}
