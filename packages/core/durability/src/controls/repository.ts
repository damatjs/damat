import { getDurabilityClient } from "../client/global";
import { mapControl } from "./rows";
import type { ControlRow } from "./rows";
import type {
  ChangeWorkControlOptions,
  WorkControl,
  WorkControlIdentity,
} from "./types";
import { writeControl } from "./write";

export async function pauseWork(
  options: ChangeWorkControlOptions,
): Promise<void> {
  await writeControl(options, true);
}

export async function resumeWork(
  options: ChangeWorkControlOptions,
): Promise<void> {
  await writeControl(options, false);
}

export async function getWorkControl(
  options: WorkControlIdentity,
): Promise<WorkControl | undefined> {
  const executor = options.executor ?? getDurabilityClient();
  const result = await executor.query<ControlRow>(
    `SELECT * FROM "_damat_work_controls"
     WHERE "work_kind" = $1 AND "scope" = $2`,
    [options.kind, options.scope],
  );
  const row = result.rows[0];
  return row ? mapControl(row) : undefined;
}
