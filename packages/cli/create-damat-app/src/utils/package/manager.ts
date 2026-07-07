import path from "path"
import execute, { ExecuteOptions, VerboseOptions } from "../commands/executor"
import logMessage from "../logger/message"
import ProcessManager from "../commands/manager"
import { existsSync, rmSync } from "fs"


type PackageManagerOptions = {
  verbose?: boolean
}

export default class PackageManager {
  protected packageManagerVersion?: string
  protected processManager: ProcessManager
  protected verbose

  constructor(
    processManager: ProcessManager,
    options: PackageManagerOptions = {}
  ) {
    this.processManager = processManager
    this.verbose = options.verbose || false
  }



  private async getVersion(
    execOptions: ExecuteOptions
  ): Promise<string | undefined> {

    try {
      const result = await execute(["bun", ["-v"], execOptions], {
        verbose: false,
      })
      const version = result.stdout?.trim()
      if (this.verbose) {
        logMessage({
          type: "info",
          message: `Detected bun version: ${version}`,
        })
      }
      return version
    } catch {
      if (this.verbose) {
        logMessage({
          type: "info",
          message: `Failed to get version for package manager: bun`,
        })
      }
      return undefined
    }
  }

  async setPackageManager(execOptions: ExecuteOptions): Promise<void> {
    // check whether package manager is available and get version
    await this.processManager.runProcess({
      process: async () => {
        const version = await this.getVersion(
          execOptions
        )

        if (version) {
          // Store version if we don't have it from user agent
          if (!this.packageManagerVersion) {
            this.packageManagerVersion = version
          }
          return
        }

        // Error logs exit the process, so command execution will stop here
        logMessage({
          type: "error",
          message: `damat currently only supports bun as a package manager. Please install it and try again.`,
        })
      },
      ignoreERESOLVE: true,
    })
  }

  async removeLockFiles(directory: string): Promise<void> {
    const lockFiles: string[] = ["bun.lock", "package-lock.json", "pnpm-lock.yaml", ".bun"];

    for (const file of lockFiles) {
      const filePath = path.join(directory, file)
      if (existsSync(filePath)) {
        rmSync(filePath, {
          force: true,
          recursive: true,
        })
      }
    }
  }

  async installDependencies(execOptions: ExecuteOptions) {
    // Remove lock files from other package managers
    if (execOptions.cwd && typeof execOptions.cwd === "string") {
      await this.removeLockFiles(execOptions.cwd)
    }

    await this.processManager.runProcess({
      process: async () => {
        await execute(["bun", ["install"], execOptions], {
          verbose: this.verbose,
        })
      },
      ignoreERESOLVE: true,
    })
  }

  // `args` is an argv array (e.g. ["dev"] or ["db:migrate", "--force"]);
  // each entry is passed to the child process as a literal argument.
  async runCommand(
    args: string[],
    execOptions: ExecuteOptions,
    verboseOptions: VerboseOptions = {}
  ) {
    return await this.processManager.runProcess({
      process: async () => {
        return await execute(["bun", ["run", ...args], execOptions], {
          verbose: this.verbose,
          ...verboseOptions,
        })
      },
      ignoreERESOLVE: true,
    })
  }

  async rundamatCommand(
    args: string[],
    execOptions: ExecuteOptions,
    verboseOptions: VerboseOptions = {}
  ) {
    return await this.processManager.runProcess({
      process: async () => {
        return await execute(["bun", ["run", "damat", ...args], execOptions], {
          verbose: this.verbose,
          ...verboseOptions,
        })
      },
      ignoreERESOLVE: true,
    })
  }

  getCommandStr(command: string): string {
    const format: string = `bun run ${command}`;

    return format
  }

  // argv form of getCommandStr for shell-free spawning: [binary, args].
  getCommandArgs(command: string): [string, string[]] {
    return ["bun", ["run", command]]
  }


  async getPackageManagerString(): Promise<string | undefined> {
    if (!this.packageManagerVersion) {
      if (this.verbose) {
        logMessage({
          type: "info",
          message: `No version detected for package manager: bun}`,
        })
      }
      return undefined
    }
    const result = `bun@${this.packageManagerVersion}`
    if (this.verbose) {
      logMessage({
        type: "info",
        message: `Package manager string: ${result}`,
      })
    }
    return result
  }
}
