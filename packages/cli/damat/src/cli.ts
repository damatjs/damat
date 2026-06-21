#!/usr/bin/env bun
import { runCli, reportError, getExitCode } from "@damatjs/cli";
import { Logger } from "@damatjs/logger";
import { buildCommand, devCommand, startCommand, moduleCommand } from './command';


runCli({
  name: "damat",
  version: "0.0.1",
  description: "Damat CLI - Development and build tool for Damat.js",
  commands: [devCommand, startCommand, buildCommand, moduleCommand],
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
