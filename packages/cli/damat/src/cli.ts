#!/usr/bin/env bun
import { runCli, reportError, getExitCode } from "@damatjs/cli";
import { Logger } from "@damatjs/logger";
import {
  authCommand,
  buildCommand,
  cloneCommand,
  createCommand,
  devCommand,
  kitCommand,
  startCommand,
  codegenCommand,
  barrelCommand,
  moduleCommand
} from './command';
import { CLI_VERSION } from "./version.generated";

runCli({
  name: "damat",
  version: CLI_VERSION,
  description: "Damat CLI - Development and build tool for Damat.js",
  commands: [
    createCommand,
    cloneCommand,
    devCommand,
    startCommand,
    buildCommand,
    codegenCommand,
    barrelCommand,
    moduleCommand,
    kitCommand,
    authCommand],
  banner: {
    title: "Damat CLI",
    subtitle: "Development and build tool for Damat.js",
    style: "boxed",
  },
}).catch((error) => {
  // Last-resort net so setup/dispatch failures surface a readable error
  // instead of a raw unhandled-rejection dump.
  reportError(new Logger({ timestamp: false }), error, { prefix: "Fatal error" });
  process.exit(getExitCode(error));
});
