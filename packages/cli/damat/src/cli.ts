#!/usr/bin/env bun
import { spawn } from "bun";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { runCli, type Command } from "@damatjs/cli";

const devCommand: Command = {
  name: "dev",
  description: "Start development server with hot reload",
  aliases: ["d"],
  options: [
    {
      name: "port",
      alias: "p",
      type: "number",
      description: "Port to run the server on",
      default: 3000,
    },
  ],
  handler: async (ctx) => {
    const port = ctx.options.port as number;

    const result = spawn({
      cmd: ["bun", "run", "--watch", "-e", `import('@damatjs/framework/entry').then(m => m.runEntry())`],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, NODE_ENV: "development", PORT: String(port) },
    });

    const exitCode = await result.exited;
    return { exitCode };
  },
};

const startCommand: Command = {
  name: "start",
  description: "Start production server",
  aliases: ["s"],
  handler: async (ctx) => {
    const distPath = join(ctx.cwd, "dist", "entry.js");

    if (!existsSync(distPath)) {
      ctx.logger.error("Build not found. Run `damat build` first.");
      return { exitCode: 1 };
    }

    const result = spawn({
      cmd: ["bun", "run", distPath],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env, NODE_ENV: "production" },
    });

    const exitCode = await result.exited;
    return { exitCode };
  },
};

const buildCommand: Command = {
  name: "build",
  description: "Build for production",
  aliases: ["b"],
  options: [
    {
      name: "output",
      alias: "o",
      type: "string",
      description: "Output directory",
      default: "dist",
    },
    {
      name: "target",
      alias: "t",
      type: "string",
      description: "Build target (bun or node)",
      default: "bun",
    },
  ],
  handler: async (ctx) => {
    const outputDir = join(ctx.cwd, ctx.options.output as string);
    const target = ctx.options.target as string;
    const tempEntryPath = join(ctx.cwd, ".damat-entry.tmp.ts");
    const entryJsPath = join(outputDir, "entry.js");

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const entryContent = `import { runEntry } from "@damatjs/framework/entry";\nrunEntry();\n`;
    writeFileSync(tempEntryPath, entryContent);

    const result = spawn({
      cmd: [
        "bun", "build", tempEntryPath,
        "--outfile", entryJsPath,
        "--target", target,
        "--packages", "external",
      ],
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await result.exited;
    
    try {
      unlinkSync(tempEntryPath);
    } catch {}
    
    return { exitCode };
  },
};

runCli({
  name: "damat",
  version: "0.0.1",
  description: "Damat CLI - Development and build tool for Damat.js",
  commands: [devCommand, startCommand, buildCommand],
  banner: {
    title: "Damat CLI",
    subtitle: "Development and build tool for Damat.js",
    style: "boxed",
  },
});
