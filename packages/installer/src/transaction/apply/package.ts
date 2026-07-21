import { relative } from "node:path";
import {
  createPackageManagerAdapter,
  detectPackageManager,
} from "../../package-manager";
import type { InstallerOperation } from "../../types/plan";
import type { InstallerRuntime } from "../../types/runtime";
import { captureInverse } from "../journal";
import type { JournalWriter } from "../types";

export async function applyPackageOperation(
  projectDir: string,
  operation: Extract<
    InstallerOperation,
    { type: "add-package" | "remove-package" }
  >,
  runtime: InstallerRuntime,
  journal: JournalWriter,
): Promise<void> {
  const name = detectPackageManager(projectDir, runtime.packageManager);
  const adapter = createPackageManagerAdapter(name, projectDir);
  for (const path of adapter.touchedFiles(projectDir))
    journal.append(captureInverse(projectDir, relative(projectDir, path)));
  const command =
    operation.type === "add-package"
      ? adapter.addCommand(
          { [operation.name]: operation.reference },
          runtime.allowScripts ?? false,
        )
      : adapter.removeCommand([operation.name], runtime.allowScripts ?? false);
  const result = await runtime.run(command);
  if (result.exitCode !== 0)
    throw new Error(result.stderr.trim() || `${name} command failed`);
}
