#!/usr/bin/env bun
import { runCli } from "@damatjs/cli";
import { buildCommand, devCommand, startCommand, codegenCommand, moduleCommand } from './command';


runCli({
  name: "damat",
  version: "0.0.1",
  description: "Damat CLI - Development and build tool for Damat.js",
  commands: [devCommand, startCommand, buildCommand, codegenCommand, moduleCommand],
  banner: {
    title: "Damat CLI",
    subtitle: "Development and build tool for Damat.js",
    style: "boxed",
  },
});
