#!/usr/bin/env bun
import { spawn } from "bun";
import { join, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cmd = process.argv[2];
const cwd = process.cwd();

switch (cmd) {
  case "dev":
    runDev();
    break;
  case "start":
    runStart();
    break;
  case "build":
    runBuild();
    break;
  default:
    console.log(`Usage: damat <command>

Commands:
  dev     Start development server with hot reload
  start   Start production server
  build   Build for production
`);
    process.exit(1);
}

function getEntryPath() {
  return join(__dirname, "../../../framework/dist/entry.js");
}

async function runDev() {
  const entryPath = getEntryPath();

  const result = spawn({
    cmd: ["bun", "run", "--watch", entryPath],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });

  const exitCode = await result.exited;
  process.exit(exitCode);
}

async function runStart() {
  const distPath = join(cwd, "dist", "entry.js");

  if (!existsSync(distPath)) {
    console.error("Build not found. Run `damat build` first.");
    process.exit(1);
  }

  const result = spawn({
    cmd: ["bun", "run", distPath],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });

  const exitCode = await result.exited;
  process.exit(exitCode);
}

async function runBuild() {
  const entryPath = getEntryPath();
  const distDir = join(cwd, "dist");

  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  const result = spawn({
    cmd: ["bun", "build", entryPath, "--outdir", distDir, "--target", "bun"],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await result.exited;
  process.exit(exitCode);
}
