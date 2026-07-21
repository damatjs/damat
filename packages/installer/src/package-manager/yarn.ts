import { makeAdapter } from "./shared";

export const yarnAdapter = (projectDir: string) =>
  makeAdapter(
    {
      name: "yarn",
      command: "yarn",
      add: "add",
      remove: "remove",
      lockfile: "yarn.lock",
    },
    projectDir,
  );
