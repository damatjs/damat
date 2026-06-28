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

export class ProjectCreatorFactory {
  // Static-only utility class: it is never meant to be instantiated. A private
  // constructor documents/enforces that intent.
  private constructor() {}

  static async create(
    args: string[],
    options: ProjectOptions,
  ): Promise<ProjectCreator> {
    ProjectCreatorFactory.validateNodeVersion();

    const projectName = await ProjectCreatorFactory.getProjectName(
      args,
      options.directoryPath,
      options.module,
    );

    return options.module
      ? new damatModuleCreator(projectName, options, args)
      : new damatProjectCreator(projectName, options, args);
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

      const projectPath = path.join(directoryPath || "", pathName);
      if (
        fs.existsSync(projectPath) &&
        fs.lstatSync(projectPath).isDirectory()
      ) {
        logMessage({
          message: `A directory already exists with the name ${pathName
            }. Please enter a different ${isModule ? "module" : "project"} name.`,
          type: "warn",
        });
        askProjectName = true;
      } else if (pathName.includes(".")) {
        // We don't allow projects to have a dot in the name, as this causes issues for
        // for MikroORM path resolutions.
        logMessage({
          message: `Project names cannot contain a dot (.) character. Please enter a different ${isModule ? "module" : "project"
            } name.`,
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

      // We don't allow projects to have a dot in the name, as this causes issues for
      // for MikroORM path resolutions.
      if (input.includes(".")) {
        return `Project names cannot contain a dot (.) character. Please enter a different ${isModule ? "module" : "project"} name.`;
      }

      if (!input.length) {
        return `Please enter a ${isModule ? "module" : "project"} name`;
      }

      const projectPath = path.join(directoryPath || "", input);
      if (
        fs.existsSync(projectPath) &&
        fs.lstatSync(projectPath).isDirectory()
      ) {
        return `A directory already exists with the same name. Please enter a different ${isModule ? "module" : "project"} name.`;
      }
    },
  });

  if (p.isCancel(projectName)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  // Apply slugify transformation
  return slugify(projectName).toLowerCase();
}
