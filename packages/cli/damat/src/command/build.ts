import { spawn } from "bun";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readdirSync, statSync, copyFileSync, rmSync } from "node:fs";
import { type Command } from "@damatjs/cli";

function copyDir(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);

    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export const buildCommand: Command = {
  name: "build",
  description: "Build for production",
  aliases: ["b"],
  options: [
    {
      name: "output",
      alias: "o",
      type: "string",
      description: "Output directory",
      default: ".damat/dist",
    },
    {
      name: "target",
      alias: "t",
      type: "string",
      description: "Build target (bun or node)",
      default: "bun",
    },
    {
      name: "minify",
      alias: "m",
      type: "boolean",
      description: "Minify the output",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const outputDir = join(ctx.cwd, ctx.options.output as string);
    const target = ctx.options.target as string;
    const minify = ctx.options.minify as boolean;
    const damatDir = join(ctx.cwd, ".damat");

    if (!existsSync(damatDir)) {
      mkdirSync(damatDir, { recursive: true });
    }

    if (existsSync(outputDir)) {
      ctx.logger.info("Cleaning old build...");
      rmSync(outputDir, { recursive: true, force: true });
    }
    
    mkdirSync(outputDir, { recursive: true });

    const tempEntryPath = join(damatDir, "build-entry.ts");
    const entryJsPath = join(outputDir, "entry.js");
    const srcDir = join(ctx.cwd, "src");

    const entryContent = `import { runEntry } from "@damatjs/framework/entry";\nrunEntry();\n`;
    writeFileSync(tempEntryPath, entryContent);

    const buildArgs = [
      "bun", "build", tempEntryPath,
      "--outfile", entryJsPath,
      "--target", target,
      "--packages", "external",
    ];

    if (minify) {
      buildArgs.push("--minify");
    }

    const result = spawn({
      cmd: buildArgs,
      cwd: ctx.cwd,
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await result.exited;

    try {
      if (existsSync(tempEntryPath)) unlinkSync(tempEntryPath);
    } catch { }

    if (exitCode === 0 && existsSync(srcDir)) {
      ctx.logger.info("Copying source files to output directory...");
      const srcDest = join(outputDir, "src");
      copyDir(srcDir, srcDest);

      const configPath = join(ctx.cwd, "damat.config.ts");
      if (existsSync(configPath)) {
        ctx.logger.info("Building config file...");
        const configJsPath = join(outputDir, "damat.config.js");

        const configResult = spawn({
          cmd: ["bun", "build", configPath, "--outfile", configJsPath, "--target", target, "--external", "pg-cloudflare"],
          cwd: ctx.cwd,
          stdout: "inherit",
          stderr: "inherit",
        });

        await configResult.exited;
      }

      ctx.logger.success("Build complete!");
    }

    return { exitCode };
  },
};
