import { execFile, spawnSync } from "child_process"
import util from "util"
import { getAbortError } from "./createAbortController"

const promiseExecFile = util.promisify(execFile)

export type ExecuteResult = {
  stdout?: string
  stderr?: string
}

export type ExecuteOptions = {
  cwd?: string | undefined
  signal?: AbortSignal | undefined
  env?: NodeJS.ProcessEnv | undefined
}

export type VerboseOptions = {
  verbose?: boolean
  // Since spawn doesn't allow us to both retrieve the
  // output and output it live without using events,
  // enabling this option, which is only useful if `verbose` is `true`,
  // defers the output of the process until after the process is executed
  // instead of outputting the log in realtime, which is the default.
  // it prioritizes retrieving the output over outputting it in real-time.
  needOutput?: boolean
}

// Commands are always [binary, argv[], options?]. Arguments are passed as an
// argv array and never interpreted by a shell (shell: false), so values such
// as project names, repo URLs, versions, and paths with spaces are treated as
// literal single arguments — no command injection, no word splitting.
export type ExecuteCommand = [string, string[], ExecuteOptions?]

const execute = async (
  command: ExecuteCommand,
  { verbose = false, needOutput = false }: VerboseOptions
): Promise<ExecuteResult> => {
  const [binary, args, options = {}] = command
  const env = {
    ...process.env,
    ...(options.env || {}),
  }

  if (verbose) {
    const childProcess = spawnSync(binary, args, {
      ...options,
      shell: false,
      stdio: needOutput
        ? "pipe"
        : [process.stdin, process.stdout, process.stderr],
      env,
    })

    if (childProcess.error || childProcess.status !== 0) {
      throw (
        childProcess.error ||
        childProcess.stderr?.toString() ||
        `${[binary, ...args].join(" ")} failed with status ${childProcess.status}`
      )
    }

    if (
      childProcess.signal &&
      ["SIGINT", "SIGTERM"].includes(childProcess.signal)
    ) {
      throw getAbortError()
    }

    if (needOutput) {
      console.log(
        childProcess.stdout?.toString() || childProcess.stderr?.toString()
      )
    }

    return {
      stdout: childProcess.stdout?.toString() || "",
      stderr: childProcess.stderr?.toString() || "",
    }
  } else {
    const childProcess = await promiseExecFile(binary, args, {
      ...options,
      env,
    })

    return {
      stdout: childProcess.stdout as string,
      stderr: childProcess.stderr as string,
    }
  }
}

export default execute
