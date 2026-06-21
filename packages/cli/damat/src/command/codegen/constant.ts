import { join } from "node:path";

export type ModuleEntry = { resolve: string; kind?: string };
export type ModuleContainer = Record<string, ModuleEntry>;

export const modelsPath = (resolve: string) => join(resolve, "models");
export const typesPath = (resolve: string) => join(resolve, "types");
