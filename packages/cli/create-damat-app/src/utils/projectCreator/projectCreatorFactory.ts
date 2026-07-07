import fs from "fs";
import * as p from "@clack/prompts";
import path from "path";
import slugify from "slugify";
import logMessage from "../logger/message";
import { getBunVersion, MIN_SUPPORTED_BUN_VERSION } from "../gets/bunVersion";
import { ProjectCreator, ProjectOptions } from "./creator";
import { damatModuleCreator } from "./damatModuleCreator";
import { damatProjectCreator } from "./damatProjectCreator";
import terminalLink from "terminal-link";
import {
  isValidRepoUrl,
  isValidVersion,
  validateProjectName,
} from "../validation";

export class ProjectCreatorFactory {
  // Static-only utility class: it is never meant to be instantiated. A private
  // constructor documents/enforces that intent.
  private constructor() {}

  static async create(
    args: string[],
    options: ProjectOptions,
  ): Promise<ProjectCreator> {
    ProjectCreatorFactory.validateNodeVersion();
    ProjectCreatorFactory.validateOptions(options);

    const projectName = await ProjectCreatorFactory.getProjectName(
      args,
      options.directoryPath,
      options.module,
    );

    return options.module
      ? new damatModuleCreator(projectName, options, args)
      : new damatProjectCreator(projectName, options, args);
  }

  // Validate CLI options early with a clear message. Both values end up as
  // git/bunx arguments, so reject anything that isn't a plausible repo
  // location or version tag. logMessage({ type: "error" }) exits the process.
  private static validateOptions(options: ProjectOptions): void {
    if (options.repoUrl && !isValidRepoUrl(options.repoUrl)) {
      logMessage({
        message: `Invalid --repo-url "${options.repoUrl}". Expected an http(s), git, or ssh URL, a git@host:path address, or an owner/repo shorthand.`,
        type: "error",
      });
    }

    if (options.version && !isValidVersion(options.version)) {
      logMessage({
        message: `Invalid --version "${options.version}". Expected a semver version or tag such as 1.2.3, v1.2.3-beta.1, or latest.`,
        type: "error",
      });
    }
  }

  private static validateNodeVersion(): void {
    const bunVersion = getBunVersion();
    if (bunVersion < MIN_SUPPORTED_BUN_VERSION) {
      logMessage({
        message: `damat requires at least v${MIN_SUPPORTED_BUN_VERSION} of Bun. You're using v${bunVersion}. Please ${terminalLink(
          "install Bun",
          "https://bun.sh/docs/installation",
        )} at least v${MIN_SUPPORTED_BUN_VERSION} and try again.`,
        type: "error",
      });
    }
  }

  private static async getProjectName(
    args: string[],
    directoryPath?: string,
    isModule?: boolean,
  ): Promise<string> {
    const pathName = args[0]
    let askProjectName = args.length === 0;
    if (args.length > 0 && pathName) {
      // Names from CLI args reach git/bunx as arguments and become directory
      // names, so they must be a safe slug (letters, digits, `-`, `_`).
      const nameError = validateProjectName(pathName, isModule);

      const projectPath = path.join(directoryPath || "", pathName);
      if (
        !nameError &&
        fs.existsSync(projectPath) &&
        fs.lstatSync(projectPath).isDirectory()
      ) {
        logMessage({
          message: `A directory already exists with the name ${pathName
            }. Please enter a different ${isModule ? "module" : "project"} name.`,
          type: "warn",
        });
        askProjectName = true;
      } else if (nameError) {
        logMessage({
          message: nameError,
          type: "error",
        });
        askProjectName = true;
      }
    }

    return askProjectName || !pathName
      ? await askForProjectName(directoryPath, isModule)
      : pathName;
  }
}

async function askForProjectName(
  directoryPath?: string,
  isModule?: boolean,
): Promise<string> {
  const defaultName = isModule ? "damat-module" : "damat-backend";

  const projectName = await p.text({
    message: `What's the name of your ${isModule ? "module" : "project"}?`,
    placeholder: defaultName,
    defaultValue: defaultName,
    validate: (value: string) => {
      const input = slugify(value).toLowerCase();

      // Enforce the same safe slug as CLI-arg names (no dots for MikroORM
      // path resolutions, no shell/flag characters).
      const nameError = validateProjectName(input, isModule);
      if (nameError) {
        return nameError;
      }

      const projectPath = path.join(directoryPath || "", input);
      if (
        fs.existsSync(projectPath) &&
        fs.lstatSync(projectPath).isDirectory()
      ) {
        return `A directory already exists with the same name. Please enter a different ${isModule ? "module" : "project"} name.`;
      }

      return undefined;
    },
  });

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  // Apply slugify transformation
  return slugify(projectName).toLowerCase();
}
