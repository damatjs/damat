import { composeCliCapabilities, defineCliCapability } from "@damatjs/cli";
import { appCliCapability } from "@damatjs/cli-app";
import { codegenCliCapability } from "@damatjs/cli-codegen";
import { kitCliCapability } from "@damatjs/cli-kit";
import { moduleCliCapability } from "@damatjs/cli-module";

export const damatCapabilities = [
  appCliCapability,
  codegenCliCapability,
  moduleCliCapability,
  kitCliCapability,
] as const;

export const damatCommands = composeCliCapabilities(damatCapabilities);

export const damatCapability = defineCliCapability({
  name: "damat",
  commands: damatCommands,
});
