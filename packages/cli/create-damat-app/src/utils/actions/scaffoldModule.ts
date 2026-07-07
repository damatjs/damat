import type { Spinner } from "yocto-spinner";
import { isAbortError } from "../commands/createAbortController";
import execute from "../commands/executor";
import logMessage from "../logger/message";

/**
 * Scaffold a module **locally** via the damat CLI's offline generator instead of
 * cloning a remote starter repo. This is the default for `create-damat-app
 * --module`: it produces a complete, current module package (wiring + AGENTS.md
 * guide + README) deterministically, without depending on a separate starter
 * repository. Pass `--repo-url` to clone a custom starter instead.
 */
export async function runScaffoldModule({
  name,
  directoryPath,
  version = "latest",
  abortController,
  spinner,
  verbose = false,
}: {
  name: string;
  directoryPath: string;
  version?: string;
  abortController: AbortController;
  spinner: Spinner;
  verbose?: boolean;
}) {
  try {
    await execute(
      [
        "bunx",
        [`@damatjs/damat-cli@${version || "latest"}`, "module", "init", name],
        {
          signal: abortController?.signal,
          cwd: directoryPath || process.cwd(),
        },
      ],
      { verbose },
    );
  } catch (e) {
    if (isAbortError(e)) {
      process.exit();
    }

    spinner.stop();
    logMessage({
      message: `An error occurred while scaffolding your module: ${e}`,
      type: "error",
    });
  }
}
