import { spawn } from "child_process"
import PackageManager from "../package/manager"

type StartOptions = {
    directory: string
    abortController?: AbortController
    packageManager: PackageManager
}

export default ({
    directory,
    abortController,
    packageManager,
}: StartOptions) => {
    // argv-array spawn (no shell): the directory is passed as cwd and never
    // interpolated into a command string, so paths with spaces are safe.
    const [binary, args] = packageManager.getCommandArgs("dev")
    const childProcess = spawn(binary, args, {
        cwd: directory,
        signal: abortController?.signal,
        env: {
            ...process.env,
        },
    })

    childProcess.stdout?.pipe(process.stdout)
    childProcess.stderr?.pipe(process.stderr)
}
