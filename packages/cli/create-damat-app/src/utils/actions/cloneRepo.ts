import fs from "fs";
import type { Spinner } from "yocto-spinner";
import path from "path";
import { isAbortError } from "../commands/createAbortController";
import execute from "../commands/executor";
import logMessage from "../logger/message";
import { execFileSync } from "child_process";

type CloneRepoOptions = {
  directoryName?: string;
  repoUrl?: string;
  abortController?: AbortController;
  verbose?: boolean;
  isModule?: boolean;
};

const DEFAULT_REPO = "https://github.com/damatjs/damat-starter-default";
const DEFAULT_MODULE_REPO =
  "https://github.com/damatjs/damat-starter-module";

export default async function cloneRepo({
  directoryName = "",
  repoUrl,
  abortController,
  verbose = false,
  isModule = false,
}: CloneRepoOptions) {
  const defaultRepo = isModule ? DEFAULT_MODULE_REPO : DEFAULT_REPO;

  // `--` stops git option parsing so a hostile repo URL can never be
  // interpreted as a flag (e.g. --upload-pack). Arguments are passed as an
  // argv array, so directory names with spaces are a single literal argument.
  await execute(
    [
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--",
        repoUrl || defaultRepo,
        ...(directoryName ? [directoryName] : []),
      ],
      {
        signal: abortController?.signal,
      },
    ],
    { verbose },
  );
}

export async function runCloneRepo({
  projectName,
  repoUrl,
  abortController,
  spinner,
  verbose = false,
  isModule = false,
}: {
  projectName: string;
  repoUrl: string;
  abortController: AbortController;
  spinner: Spinner;
  verbose?: boolean;
  isModule?: boolean;
}) {
  try {
    await cloneRepo({
      directoryName: projectName,
      repoUrl,
      abortController,
      verbose,
      isModule,
    });

    deleteGitDirectory(projectName);
    await initializeFreshGit({ directory: projectName, abortController, verbose });
  } catch (e) {
    if (isAbortError(e)) {
      process.exit();
    }

    spinner.stop();
    logMessage({
      message: `An error occurred while setting up your project: ${e}`,
      type: "error",
    });
  }
}

function deleteGitDirectory(projectDirectory: string) {
  try {
    fs.rmSync(path.join(projectDirectory, ".git"), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    deleteWithCommand(projectDirectory, ".git");
  }

  try {
    fs.rmSync(path.join(projectDirectory, ".github"), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    deleteWithCommand(projectDirectory, ".github");
  }
}

/**
 * Useful for deleting directories when fs methods fail (e.g., with Yarn v3)
 */
function deleteWithCommand(projectDirectory: string, dirName: string) {
  const dirPath = path.normalize(path.join(projectDirectory, dirName));
  if (!fs.existsSync(dirPath)) {
    return;
  }

  if (process.platform === "win32") {
    execFileSync("cmd", ["/c", "rmdir", "/s", "/q", dirPath]);
  } else {
    execFileSync("rm", ["-rf", dirPath]);
  }
}

export async function initializeFreshGit({
  directory,
  abortController,
  verbose = false,
  initialMessage = "chore: bootstrap project structure",
  branchName = "main",
}: {
  // The scaffolded project directory. Every git step MUST run inside it —
  // omitting cwd would silently init/commit a repo over the user's current
  // working tree instead of the new project.
  directory: string;
  abortController?: AbortController;
  verbose?: boolean;
  initialMessage?: string;
  branchName?: string;
}) {
  const execOptions = {
    cwd: directory,
    signal: abortController?.signal,
  };

  const run = (args: string[]) =>
    execute(["git", args, execOptions], { verbose });

  try {
    await run(["init", "-b", branchName]);
  } catch (err) {
    if (verbose) {
      console.warn("No changes to initialize.");
    }
  }

  try {
    await run(["add", "."]);
  } catch (err) {
    if (verbose) {
      console.warn("No changes to add.");
    }
  }

  try {
    await run(["commit", "-m", initialMessage]);
  } catch (err) {
    if (verbose) {
      console.warn("No changes to commit.");
    }
  }
}
