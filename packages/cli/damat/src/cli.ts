#!/usr/bin/env bun
import { runCli, reportError, getExitCode } from "@damatjs/cli";
import { damatCommands } from "./capabilities";
import { CLI_VERSION } from "./version.generated";
import { createDamatRuntime } from "./runtime";

const runtime = createDamatRuntime();

runCli(
  {
    name: "damat",
    version: CLI_VERSION,
    description: "Damat CLI - Development and build tool for Damat.js",
    commands: damatCommands,
    banner: {
      title: "Damat CLI",
      subtitle: "Development and build tool for Damat.js",
      style: "boxed",
    },
    verbose: { enabled: true },
  },
  runtime,
)
  .then((result) => {
    process.exitCode = result.exitCode;
  })
  .catch((error) => {
    // Last-resort net so setup/dispatch failures surface a readable error
    // instead of a raw unhandled-rejection dump.
    reportError(runtime.logger, runtime.output, error, {
      prefix: "Fatal error",
      verbose:
        runtime.args.includes("--verbose") || Boolean(runtime.env.DAMAT_DEBUG),
    });
    process.exitCode = getExitCode(error);
  });
