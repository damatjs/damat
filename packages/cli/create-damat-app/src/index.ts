#!/usr/bin/env bun
import { runCli, type Command } from "@damatjs/cli";
import create from "./commands/create";
import type { ProjectOptions } from "./utils/projectCreator";

const createCommand: Command = {
  name: "create",
  description: "Create a new damat project or module",
  aliases: ["init", "new"],
  options: [
    {
      name: "module",
      type: "boolean",
      description: "Create a module instead of a project",
      default: false,
    },
    {
      name: "repo-url",
      alias: "r",
      type: "string",
      description: "URL of repository to setup project from",
    },
    {
      name: "version",
      alias: "v",
      type: "string",
      description: "The version of damat packages to install",
      default: "latest",
    },
    {
      name: "directory-path",
      alias: "d",
      type: "string",
      description: "Specify the directory path to install the project in",
    },
  ],
  handler: async (ctx) => {
    const projectName = ctx.args[0];

    const options: ProjectOptions = {
      module: ctx.options.module as boolean,
      repoUrl: (ctx.options["repo-url"] as string) ?? null,
      version: (ctx.options.version as string) ?? "latest",
      directoryPath: (ctx.options["directory-path"] as string) ?? process.cwd(),
      verbose: ctx.options.verbose as boolean,
    };

    await create(projectName ? [projectName] : [], options);
    return { exitCode: 0 };
  },
};

runCli({
  name: "create-damat-app",
  version: "0.0.1",
  description: "Create a damat project using a single command.",
  commands: [createCommand],
  banner: {
    title: "Create Damat App",
    subtitle: "Scaffold new DamatJS projects instantly",
    style: "boxed",
  },
});
